# Obsidian Daily Note Outline
Daily notes are a good place to write down various little notes and thoughts. However, it can be difficult to find which daily note you wrote them in later.
This plugin creates a custom view that displays the outlines of multiple daily notes at once. The outline can display not only headings, but also links, tags and list items.

デイリーノートはちょっとしたメモや雑多な考えを書き留めるのに便利です。しかし、後からどこに書いたのか探すのに苦労することがあります。
このプラグインは、サイドペインに複数のデイリーノートのアウトラインを一括表示して、デイリーノートに書いた内容を把握しやすくするためのものです。見出しだけでなくリンク、タグ、リスト項目なども表示できます。

![screenshot](others/screenshot.png)

## Getting started
Install the plugin with Obsidian BRAT plugin and enable it.
In the command palette, choose "Daily Note Outline: Open Outline".

本プラグインをObsidian BRATプラグインを使ってインストールし、有効化して下さい。
コマンドパレットから、「Daily Note Outline: Open Outline」を実行して下さい。

## How to use
To change the date range to display, click on the left and right arrows.
To return to the initial range, click on the house icon.
Click on the refresh icon to redraw the outline, e.g., if you have changed the settings.
Click on each outline element to open its location.

表示する日付の範囲を変更したいときは、左右の矢印をクリックして下さい。
家のアイコンをクリックすると初期設定の範囲に戻ります。
設定を変更したときなど、再描画が必要なときは更新アイコンをクリックして下さい。
各アウトライン要素をクリックするとその場所を開きます。

## Settings
### initial search type
- backward(default)
	- Displays the past daily notes for the specified number of days starting from today.  今日を起点として指定した日数分の過去のデイリーノートを表示します。通常こちらで良いと思います。
- forward
	- Displays daily notes for the specified number of days starting from the date specified in Onset date. Onset dateで指定した日付を起点として、指定日数分のデイリーノートを表示します。
### search duration
Specify the number of days to be explored per page. It is recommended to set a shorter period for those who use Daily notes every day and a longer period for those who use it only occasionally.
1ページあたりに探索するデイリーノートの期間を日で指定します。デイリーノートを頻繁に使用する人は短く、たまにしか使わない人は長く設定するといいと思います。7日~56日くらいでしょうか。

### include future daily notes
When backward search is used, daily notes of the specified number of days in the future are also displayed (If you set it long enough, you can also use this plugin as a list of upcoming events!).
サーチタイプがbackward search のとき、指定した日数分未来のデイリーノートも表示します。長くすれば将来のイベントのリストとしても使えます！

### onset date
For forward search, specify the date in YYYY-MM-DD format to start the search at startup.
サーチタイプがforward search のとき起動時に探索開始する日付をYYYY-MM-DDの形式で指定します。

### show headings / links / tags / list items 
Choose whether each element should be displayed in outline.
それぞれの要素をアウトラインとして表示するか指定します。

### show all root list items
With respect to list item, if this setting is off, it shows only the first item in a continuous list. When turned on, it displays all list items at root level.
リスト項目に関して、この設定がオフになっていると連続したリストの初めの項目だけを表示します。オンになっていると、ルートレベルの項目（＝インデントされていない項目）を全て表示します。

## acknowledgement
I am new to programming and have found many great plugins in Obsidian community helpful. In particular, 
Daily note interface by @liamcain for processing daily notes.
Spaced Repetition by @st3v3nmw and Recent Files by @tgrosinger for creating custom views.
I also searched and referred to a bunch of posts in plugin-dev channel on Discord.

私はプログラミングの初心者で、多くの素晴らしいObsidianのプラグインを参考に作らせて頂きました。特に、
デイリーノートの処理にdaily note interface by @liamcain を使わせて頂きました。
カスタムビューの作成にSpaced Repetition by st3v3nmwとRecent files by tgrosingerを大いに参考にさせて頂きました。
また、discordの plugin-devの書き込みを多数参考にさせて頂きました。

## (want) to do
- show number of lines of each note
- show the first section if no outline element exists
- collapse a note
- UI button for change settings
- better appearance
- better preview
- filter / extract
- note refactoring
- show linked mentions / created / modefied files on each day (feasible in terms of performance?)
- derivative plugin for other than daily notes
