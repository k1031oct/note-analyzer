/**
 * ===================================================================
 * note & X 統合分析アプリケーション Cloud Functions プログラム (v1構文, v1ライブラリ対応版)
 * ===================================================================
 */

import { onRequest } from "firebase-functions/v2/https";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onCall } from "firebase-functions/v2/https";
import { setGlobalOptions, logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {parse} from "csv-parse/sync";

admin.initializeApp();

setGlobalOptions({ region: "asia-northeast1", secrets: ["X_CLIENT_ID", "X_CLIENT_SECRET"] });

const db = admin.firestore();
const storage = admin.storage();

/**
 * JSTの日付 (YYYY-MM-DD) を取得するヘルパー関数
 * @return {string} JSTの日付文字列
 */
const getJstDateString = () => {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000; // 9時間
  const jstDate = new Date(now.getTime() + jstOffset);
  return jstDate.toISOString().split("T")[0];
};

/**
 * X APIへのリクエストを再試行するヘルパー関数 (指数バックオフ付き)
 * @param {string} endpoint
 * @param {any} options
 * @param {number} retries
 * @return {Promise<Response>}
 */
async function retryFetch(endpoint: string, options: any, retries = 3): Promise<Response> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      const response = await fetch(endpoint, options);
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : (2 ** attempt) * 2000;
        logger.warn(`[retryFetch] X API rate limit hit (429). Retrying in ${delay / 1000} seconds. Attempt ${attempt + 1}/${retries}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
        continue;
      } else if (!response.ok) {
        const errorBody = await response.text();
        logger.error(`[retryFetch] X API request failed with status ${response.status}, Body: ${errorBody}`);
        return response;
      }
      return response;
    } catch (error) {
      logger.error(`[retryFetch] Network or unexpected error during fetch attempt ${attempt + 1}:`, error);
      attempt++;
      if (attempt >= retries) throw error;
      const delay = (2 ** attempt) * 2000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`Failed to fetch from X API after ${retries} retries.`);
}

// ■■■ 1. X API連携 ■■■
export const fetchXRealtimeData = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS, POST");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
  }

  try {
    const uid = req.query.uid as string;
    if (!uid) {
      logger.error("[fetchXRealtimeData] UID is missing.");
      res.status(400).send("User ID is missing.");
      return;
    }

    const tokenDoc = await db.collection("x_tokens").doc(uid).get();
    if (!tokenDoc.exists) {
      logger.error(`[fetchXRealtimeData] X token not found for user ${uid}.`);
      res.status(403).send("X account not connected.");
      return;
    }

    const tokenData = tokenDoc.data();
    let accessToken = tokenData?.access_token;

    const now = new Date();
    const updatedAt = tokenData?.updated_at.toDate();
    const expiresIn = tokenData?.expires_in;
    if (updatedAt && expiresIn && now.getTime() > updatedAt.getTime() + expiresIn * 1000) {
      logger.info(`[fetchXRealtimeData] Token expired for user ${uid}. Refreshing...`);
      const clientId = process.env.X_CLIENT_ID;
      const clientSecret = process.env.X_CLIENT_SECRET;
      const refreshToken = tokenData?.refresh_token;

      const response = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error(`[fetchXRealtimeData] Token refresh failed for user ${uid}: ${response.status} ${errorBody}`);
        res.status(500).send("Failed to refresh X token.");
        return;
      }

      const newTokenData = await response.json();
      await db.collection("x_tokens").doc(uid).update({
        access_token: newTokenData.access_token,
        refresh_token: newTokenData.refresh_token,
        expires_in: newTokenData.expires_in,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      accessToken = newTokenData.access_token;
    }

    const userMeResponse = await retryFetch("https://api.twitter.com/2/users/me", {
      headers: {"Authorization": `Bearer ${accessToken}`},
    });
    if (!userMeResponse.ok) throw new Error("Failed to get authenticated user ID.");
    const {data: userData} = await userMeResponse.json();
    const authenticatedUserId = userData.id;

    const endpoint = `https://api.twitter.com/2/users/${authenticatedUserId}/tweets?max_results=100&tweet.fields=public_metrics`;
    const response = await retryFetch(endpoint, {
      headers: {"Authorization": `Bearer ${accessToken}`},
    });
    if (!response.ok) throw new Error(`X API request failed: ${response.status}`);
    const {data: tweetsFromApi} = await response.json();
    if (!tweetsFromApi) {
      res.status(200).send("No tweets found.");
      return;
    }

    const articlesSnapshot = await db.collection("articles").where("authorId", "==", uid).get();
    if (articlesSnapshot.empty) {
      res.status(200).send("No articles found for user.");
      return;
    }

    const dateId = getJstDateString();
    const batch = db.batch();
    for (const articleDoc of articlesSnapshot.docs) {
      const articleData = articleDoc.data();
      const articleTitle = articleData.title;
      const articleUrl = articleData.url;
      if (!articleUrl) {
        logger.warn(`[fetchXRealtimeData] URL is not set for article "${articleTitle}", skipping.`);
        continue;
      }

      let impressions = 0, likes = 0, replies = 0, retweets = 0, quotes = 0;
      for (const tweet of tweetsFromApi) {
        if (tweet.text.includes(articleUrl)) {
          impressions += tweet.public_metrics?.impression_count || 0;
          likes += tweet.public_metrics?.like_count || 0;
          replies += tweet.public_metrics?.reply_count || 0;
          retweets += tweet.public_metrics?.retweet_count || 0;
          quotes += tweet.public_metrics?.quote_count || 0;
          logger.info(`[fetchXRealtimeData] マッチ成功: "${articleTitle}"`);
        }
      }

      if (impressions > 0 || likes > 0) {
        const snapshotRef = articleDoc.ref.collection("daily_snapshots").doc(dateId);
        batch.set(snapshotRef, {
          x_preliminary_data: {impressions, likes, replies, retweets, quotes},
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});
        logger.info(`[fetchXRealtimeData] 「${articleTitle}」の速報値をバッチに追加。`);
      }
    }
    await batch.commit();
    res.status(200).send("OK");
  } catch (error) {
    logger.error("[fetchXRealtimeData] エラー:", error);
    res.status(500).send("Internal Server Error");
  }
});

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
      logger.warn(`[onCsvUpload] URL is not set for article "${articleTitle}", skipping.`);
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


// ■■■ 4. X OAuth ■■■
export const oauthCallback = onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS, POST");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    res.status(501).send("OAuth callback not fully implemented in this version.");
});


// ■■■ 5. X接続状態チェック ■■■
export const isXConnected = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    return {isConnected: false};
  }
  const tokenDoc = await db.collection("x_tokens").doc(uid).get();
  return {isConnected: tokenDoc.exists};
});