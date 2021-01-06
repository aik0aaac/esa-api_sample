"use strict";

/**
 * esa.ioのAPIを使用し、esa.ioへ記事を投稿するスクリプトです。
 * ※ファイル毎に行います
 * 下記のパラメータに値を指定し、記事を投稿可能です。
 * 本コードを実行すると、そのレスポンス結果が同ディレクトリ内の「response/response.txt」に出力されます。
 *
 * ※AccessToken、チーム名は本ファイルと同ディレクトリ内に`.env`ファイルを配置し、その中に下記の記述を行い使用してください:
 *
 * ```
 * ACCESS_TOKEN=[accessToken]
 * TEAM_NAME=[チーム名]
 * ```
 */
// インポートしたい記事の内容が記載されたファイル名を指定(相対パス指定)、文字コードはutf-8にすること
const importFileName = "importFile.md";
// インポートしたい記事タイトル
const importTitle = "";
// インポートカテゴリ名
const importCategory = "";

// import関連
require("dotenv").config();
const request = require("request");
const fs = require("fs");

/**
 * APIリクエストデータ設定
 */
const body_md = fs.readFileSync(importFileName, {
  encoding: "utf-8",
});

// POSTデータ整形
const postData = {
  post: {
    name: importTitle,
    body_md: body_md,
    category: importCategory,
    wip: false,
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
      console.log("正常に書き込みが完了しました。");
    });
  } catch (e) {
    console.log("レスポンス結果ファイル出力時にエラーが発生しました。");
  } finally {
    console.log(
      "出力結果は同ディレクトリ内の「response/response.txt」内に格納されています。"
    );
  }
});
