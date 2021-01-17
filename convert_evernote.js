"use strict";

/**
 * Evernote for Windows(Legacy)でエクスポートされたHTML情報を、Markdownファイルに変換するスクリプトです。
 * 下記で指定したフォルダ内部の第1階層のHTMLファイルをもとに、Markdownに変換したファイルを`result`フォルダに都度生成していきます。
 * 実行コマンド: `node convert_evernote.js [データ格納場所フォルダパス]`
 */

// import関連
const fs = require("fs");
const fsExtra = require("fs-extra");
const util = require("util");
const path = require("path");
const readdir = util.promisify(fs.readdir);
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

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
    // dirents.forEach(async (dirent, i) => {});
  } catch (e) {
    console.error(e);
    throw e;
  }

  return result;
}

/**
 * 指定したEvernote形式のファイルをMarkdown形式に変換する。
 * @param {string} filepath パス名
 */
async function convertEvernoteToMarkdown(filepath) {
  // 対象ファイルがHTML拡張子でない場合、処理をSkip
  if (!/.*\.html/.test(filepath)) {
    return;
  }

  // ファイルを読み込み
  const fileData = fs.readFileSync(filepath, "utf8");
  // 読み取ったデータをHTML Objectに変換
  const document = new JSDOM(fileData).window.document;

  // Markdown出力内容を指定
  let body = [];
  document
    .querySelector("body")
    .textContent.split("\n")
    .forEach((e) => {
      // 空白しか含まれていない or 空文字であれば何もしない
      if (!e || !e.match(/\S/g)) {
        return;
      }
      body.push(e.match(/\s{4}(.*)/)[1]);
    });
  body = body.join("\n");

  // コンバート結果
  let result = {
    // 記事タイトル
    title: path.basename(filepath),
    // Markdown出力内容
    body: body,
  };

  // 生成対象ディレクトリ名
  const resultDirName = "result";
  // Markdownデータ書き込み
  try {
    // 書き込み先ファイルディレクトリ定義
    const writeFileDir = path.join(resultDirName, path.dirname(filepath));
    // 書き込み先ファイルパス定義
    const writeFilePath = path.join(writeFileDir, result.title + ".md");
    // 書き込み先ファイルのディレクトリが存在しなければ作成
    if (!fs.existsSync(writeFileDir)) {
      fsExtra.mkdirsSync(writeFileDir);
    }
    // データ書き込み
    fs.writeFileSync(writeFilePath, result.body);
    console.log("write end");
  } catch (e) {
    console.error("ファイルの書き込みに失敗しました。");
    console.error(e);
    throw e;
  }
}

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
  console.info("Evernote形式の書式をMarkdown形式に変換します。");

  try {
    for (let i = 0; i < filepaths.length; i++) {
      console.info(`変換(${i + 1}個目/${filepaths.length})…`);
      await convertEvernoteToMarkdown(filepaths[i]);
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
