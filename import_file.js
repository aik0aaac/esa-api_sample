"use strict";

/**
 * esa.ioのAPIを使用し、esa.ioへ記事を投稿するスクリプトです。
 * ※ファイル毎に行います
 * 本ファイルと同ディレクトリに配置された`import_file_data.json`からインポート情報を読み込み、記事を投稿可能です。
 * 本コードを実行すると、そのレスポンス結果が同ディレクトリ内の「response/response.txt」に出力されます。
 *
 * ※AccessToken、チーム名は本ファイルと同ディレクトリ内に`.env`ファイルを配置し、その中に下記の記述を行い使用してください:
 *
 * ```
 * ACCESS_TOKEN=[accessToken]
 * TEAM_NAME=[チーム名]
 * ```
 */
// インポートしたい記事の内容が格納されたファイル
const importFileData = "./import_file_data.yaml";

// import関連
const fs = require("fs");
const yaml = require("js-yaml");
const request = require("request");
require("dotenv").config();

/**
 * APIリクエストデータ設定
 */
// インポートデータ読み取り
const importDataText = fs.readFileSync(importFileData, "utf8");
// yamlデータをJSONデータに変換
const importData = yaml.load(importDataText);
// インポートデータより対象ファイルを特定、対象ファイルの内容を読み取りs
const body_md = fs.readFileSync(importData.filename, "utf8");

// POSTデータ整形
const postData = {
  post: {
    name: importData.post.name,
    body_md: body_md,
    category: importData.post.category,
    wip: importData.post.wip,
  },
};

// リクエスト送付先設定
const options = {
  url: `https://api.esa.io/v1/teams/${process.env.TEAM_NAME}/posts`, // APIエンドポイント設定
  method: "POST", // APIリクエストメソッド設定
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.ACCESS_TOKEN}`, // Authorize情報の代わりにAccessTokenを渡す
  },
  json: true,
  form: postData,
};

// APIリクエスト
request(options, function (error, response, body) {
  // レスポンスデータ整形
  let writeFileData = `
------------------------------
body:
------------------------------
${JSON.stringify(body)}

------------------------------
response:
------------------------------
${JSON.stringify(response)}
`;
  // エラー時: レスポンスデータにはエラーデータを出力
  if (error) {
    writeFileData = `
------------------------------
error:
------------------------------
${JSON.stringify(error)}
`;
  }

  try {
    // レスポンス結果をファイル内に書き込み
    fs.writeFile("response/response.txt", writeFileData, (err) => {
      if (err) throw err;
      console.info("正常に書き込みが完了しました。");
    });
  } catch (e) {
    console.error("レスポンス結果ファイル出力時にエラーが発生しました。");
  } finally {
    console.info(
      "出力結果は同ディレクトリ内の「response/response.txt」内に格納されています。"
    );
  }
});
