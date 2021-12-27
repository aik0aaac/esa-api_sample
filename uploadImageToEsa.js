"use strict";

/**
 * 指定された画像ファイルをesa.ioへアップロード。
 * 実行方法: `node uploadImageToEsa.js`
 * - 入力ファイル書式:`inputFileName`の変数のファイル名にあるJSONデータ
 * JSONデータ:
 * ```json
 * [{"filePath": "","fileName": ""},
 * {"filePath": "","fileName": ""}]
 * ```
 * - 出力ファイル: esa.io
 */

require("dotenv").config();
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");

// 入力ファイルのファイルパス
const inputFileName = "importData/targetImageData.json";
// 入力ファイルから取得対象となる画像パスを取得
const targetImageDataStr = fs.readFileSync(inputFileName, "utf-8");
const targetImageData = JSON.parse(targetImageDataStr);

// アップロードした画像のURL出力先
const outputImageUrlsFilepath = "response/esaImageUrls.txt";
// URL出力用のテキスト内容を溜め込む変数
let outputImageUrlsText = "";

// esa.io関連の情報を格納
const esa_teamName = process.env.TEAM_NAME;
const esa_AccessToken = process.env.ACCESS_TOKEN;

/**
 * Main関数。
 */
(async () => {
  // 取得対象ごとに処理実行
  for (let i = 0; i < targetImageData.length; i++) {
    const fileName = targetImageData[i].fileName;
    const filePath = targetImageData[i].filePath;
    const type = targetImageData[i].type;

    // 画像のメタデータを取得
    const responseBody = await getMetaData(fileName, filePath, type);
    // 画像をアップロード
    await uploadImage(responseBody, fileName, filePath);
    // esa.io用の画像URLを出力ファイルに出力
    outputImageUrlsText += `<img width="650" alt="${fileName}" src="${responseBody.attachment.url}">\n`;
  }

  // 出力ファイルに出力
  writImageUrlsToFile(outputImageUrlsText, outputImageUrlsFilepath);
})();

/**
 * esa.ioから指定したファイルのメタデータを取得する。
 * @param {*} fileName アップロード対象のファイル名
 * @param {*} filePath アップロード対象のファイル
 * @param {*} type アップロード対象のファイルタイプ
 */
async function getMetaData(fileName, filePath, type) {
  // POSTデータ整形
  const fileSize = await fs.statSync(filePath).size;

  const postData = {
    name: fileName,
    type: type,
    size: fileSize,
  };
  // Request Header設定
  const headers = {
    Authorization: `Bearer ${esa_AccessToken}`, // Authorize情報の代わりにAccessTokenを渡す
  };
  // APiコール
  const url = `https://api.esa.io/v1/teams/${esa_teamName}/attachments/policies`; // APIエンドポイント設定
  try {
    const response = await axios.post(url, postData, {
      headers: headers,
    });
    // MEMO: レスポンスBodyは`response.data`内部に格納されている
    return response.data;
  } catch (e) {
    displayErrorResponse(error);
  }
}

/**
 * メタデータを元にファイルをAmazon S3へアップロードする。
 * @param {*} responseBody esa.ioAPI経由で取得したメタデータ
 * @param {*} fileName アップロード対象のファイル名
 * @param {*} filePath アップロード対象のファイル
 */
async function uploadImage(responseBody, fileName, filePath) {
  // フォームデータを定義
  const formData = new FormData();
  // 各種必要情報をフォームデータに格納
  formData.append("AWSAccessKeyId", responseBody.form.AWSAccessKeyId);
  formData.append("signature", responseBody.form.signature);
  formData.append("policy", responseBody.form.policy);
  formData.append("key", responseBody.form.key);
  formData.append("Content-Type", responseBody.form["Content-Type"]);
  formData.append("Cache-Control", responseBody.form["Cache-Control"]);
  formData.append(
    "Content-Disposition",
    responseBody.form["Content-Disposition"]
  );
  formData.append("acl", responseBody.form.acl);
  // 画像データをフォームデータに格納
  const fileData = fs.createReadStream(filePath);
  formData.append("file", fileData, fileName);

  // 画像データのLengthを取得しHeader設定
  // formData.getLengthメソッドはPromiseに対応しておらずCallback関数のみサポートしているため、下記の様な処理となる
  formData.getLength(function (err, length) {
    if (err) {
      this._error(err);
      return;
    }
    // Request Header設定
    const headers = {
      "Content-Length": length,
      ...formData.getHeaders(), // これで`Content-Type: multipart/form-data;`を宣言してくれる
    };

    // APiコール
    const url = responseBody.attachment.endpoint;
    try {
      const response = axios({
        method: "post",
        url: url,
        data: formData,
        headers: headers,
      });
      console.info("正常終了です。");
    } catch (error) {
      displayErrorResponse(error);
    }
  });
}

/**
 * エラーレスポンス情報をコンソール上に表示する関数。
 * @param {*} error エラーレスポンス情報
 */
function displayErrorResponse(error) {
  console.error(error);
  console.error("エラーが発生しました。");
  console.error(error.response.status);
  console.error(error.response.data);
}

/**
 * テキスト内容を受け取り書き込み対象ファイルパスに記入する。
 * @param {*} text 出力するテキスト内容。
 * @param {*} filePath 書き込み対象ファイルパス。
 */
function writImageUrlsToFile(text, filePath) {
  try {
    fs.writeFileSync(filePath, text);
    console.info("書き込みが正常に終了しました。");
    console.info("書き込み対象ファイルパス: " + filePath);
  } catch (e) {
    console.info("書き込みが異常終了しました。");
    console.error(e);
  }
}
