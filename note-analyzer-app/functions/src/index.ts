/**
 * ===================================================================
 * note & X 統合分析アプリケーション Cloud Functions プログラム (v1構文, v1ライブラリ対応版)
 * ===================================================================
 */

import { onObjectFinalized } from "firebase-functions/v2/storage";
import { setGlobalOptions, logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {parse} from "csv-parse/sync";

admin.initializeApp();

setGlobalOptions({ region: "asia-northeast1" });

const db = admin.firestore();
const storage = admin.storage();

// ■■■ 2. CSV処理 ■■■
export const onCsvUpload = onObjectFinalized(async (event) => {
  if (!event || !event.data || !event.data.name) {
    logger.error("[onCsvUpload] Storage object or name is undefined.");
    return;
  }
  const filePath = event.data.name;
  if (!filePath.startsWith("analytics_csv/")) {
    logger.info(`[onCsvUpload] Not a target file: ${filePath}`);
    return;
  }

  const uid = filePath.split("/")[1];
  if (!uid) {
    logger.error("[onCsvUpload] Could not extract UID from path.");
    return;
  }

  const bucket = storage.bucket(event.data.bucket);
  const file = bucket.file(filePath);
  const [fileContent] = await file.download();
  const csvData = fileContent.toString("utf-8");
  const records = parse(csvData, {columns: true, skip_empty_lines: true});
  if (records.length === 0) {
    logger.info("[onCsvUpload] CSV is empty.");
    return;
  }

  const headers = Object.keys(records[0] || {});
  const expectedHeaders = ["ポスト本文", "日付", "インプレッション数", "いいね", "エンゲージメント"];
  const missingHeaders = expectedHeaders.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    logger.error(`[onCsvUpload] CSV missing headers: ${missingHeaders.join(", ")}.`);
    return;
  }

  const articlesSnapshot = await db.collection("articles").where("authorId", "==", uid).get();
  if (articlesSnapshot.empty) {
    logger.warn(`[onCsvUpload] No articles found for user ${uid}.`);
    return;
  }

  const batch = db.batch();
  for (const articleDoc of articlesSnapshot.docs) {
    const articleData = articleDoc.data();
    const articleTitle = articleData.title;
    const articleUrl = articleData.url;
    if (!articleUrl) {
      logger.warn(`[onCsvUpload] URL is not set for article \"${articleTitle}\", skipping.`);
      continue;
    }

    const dailyMetrics = new Map();
    for (const record of records) {
      const postText = (record as any)["ポスト本文"];
      const recordDate = (record as any)["日付"];
      if (postText && postText.includes(articleUrl) && recordDate) {
        try {
          const dateId = new Date(recordDate).toISOString().split("T")[0];
          const metrics = dailyMetrics.get(dateId) || {impressions: 0, likes: 0, engagements: 0};
          metrics.impressions += parseInt((record as any)["インプレッション数"]) || 0;
          metrics.likes += parseInt((record as any)["いいね"]) || 0;
          metrics.engagements += parseInt((record as any)["エンゲージメント"]) || 0;
          dailyMetrics.set(dateId, metrics);
        } catch (e) {
          logger.warn(`[onCsvUpload] Invalid date format, skipping: ${recordDate}`);
        }
      }
    }

    for (const [dateId, metrics] of dailyMetrics.entries()) {
      if (metrics.impressions > 0 || metrics.likes > 0 || metrics.engagements > 0) {
        const snapshotRef = articleDoc.ref.collection("daily_snapshots").doc(dateId);
        batch.set(snapshotRef, {
          x_confirmed_data: metrics,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});
        logger.info(`[onCsvUpload] 「${articleTitle}」(${dateId}) の確定値をバッチに追加。`);
      }
    }
  }
  await batch.commit();
  logger.info("[onCsvUpload] Batch commit complete.");
});
