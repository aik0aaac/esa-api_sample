"use strict";

/**
 * esa.ioのAPIを使用し、esa.ioへ記事を投稿するスクリプトです。
 * ※フォルダに対し一気に行います。
 * ※記事タイトルは`[その記事のファイル名(相対パス)]`になります。
 *
 * 引数:
 * - 第1引数: インポート対象のフォルダ(相対パス)
 *
 * ※AccessToken、チーム名は本ファイルと同ディレクトリ内に`.env`ファイルを配置し、その中に下記の記述を行い使用してください:
 *
 * ```
 * ACCESS_TOKEN=[accessToken]
 * TEAM_NAME=[チーム名]
 * ```
 */

// import関連
require("dotenv").config();
const fs = require("fs");
const util = require("util");
const path = require("path");
const readdir = util.promisify(fs.readdir);
const request = require("request");

/**
 * ディレクトリを読み込み、ディレクトリ内部の各ファイルパスのリストを返却。
 * @param {string} dirpath ディレクトリパス
 */
async function readDirectory(dirpath) {
  let result = [];
  try {
    const dirents = await readdir(dirpath, { withFileTypes: true });
    for (let i = 0; i < dirents.length; i++) {
      // 対象データがディレクトリの場合、再起的に実行
      if (dirents[i].isDirectory()) {
        const tmpResult = await readDirectory(
          path.join(dirpath, dirents[i].name)
        );
        result = result.concat(tmpResult);
      } else {
        // path名をresult内にpush
        result.push(path.join(dirpath, dirents[i].name));
      }
    }
  } catch (e) {
    console.error(e);
    throw e;
  }

  return result;
}
/**
 * esa.ioへ指定したファイルの内容をimportする。
 * @param {*} filepath
 */
function importArticle(filepath) {
  // インポート対象記事内容読み込み
  const body_md = fs.readFileSync(filepath, {
    encoding: "utf-8",
  });
  // POSTデータ整形
  const postData = {
    post: {
      name: filepath.match(/^(.*)\.md$/)[1],
      body_md: body_md,
      category: "",
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

  // APiコール
  return new Promise((resolve, reject) => {
    request(options, function (error, response, body) {
      if (error) {
        console.error(JSON.stringify(error));
        reject("ページを取得できませんでした");
      } else {
        resolve("取得できました");
      }
    });
  });
}

/**
 * Sleep関数。
 * 参考: https://hirooooo-lab.com/development/javascript-sleep/
 * @param {*} ms sleepさせる秒数(単位: 秒)
 */
const _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms * 1000));

async function main() {
  console.info(
    `指定したディレクトリ: ${process.argv[2]} のファイルデータを読み取ります。`
  );
  let filepaths;
  try {
    filepaths = await readDirectory(process.argv[2]);
  } catch (e) {
    throw e;
  }

  console.info("読み取り完了。");
  console.info(
    "フォルダ内の拡張子が`.md`のファイルをesa.ioにインポートします。"
  );
  // 取得したPathの中からMarkdown拡張子のものを抽出
  const markdownFilepath = filepaths.filter((e) => /.*\.md/.test(e));

  // 処理実行
  try {
    for (let i = 0; i < markdownFilepath.length; i++) {
      console.log(`対象ファイル名: ${markdownFilepath[i]}`);
      console.info(`import (${i + 1}個目/${markdownFilepath.length})…`);
      await importArticle(markdownFilepath[i]);
      await _sleep(15);
    }
  } catch (e) {
    throw e;
  }
}

main()
  .then(() => {
    console.log("🎉正常終了しました!");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
