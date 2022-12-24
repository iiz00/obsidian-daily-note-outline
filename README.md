# Obsidian Daily Note Outline
Daily notes are a good place to write down various little notes and thoughts. However, it can be difficult to find which daily note you wrote them in later.
This plugin creates a custom view that displays the outlines of multiple daily notes at once. The outline can display not only headings, but also links, tags and list items.

デイリーノートはちょっとしたメモや雑多な考えを書き留めるのに便利です。しかし、後からどこに書いたのか探すのに苦労することがあります。
このプラグインは、サイドペインに複数のデイリーノートのアウトラインを一括表示して、デイリーノートに書いた内容を把握しやすくするためのものです。見出しだけでなくリンク、タグ、リスト項目なども表示できます。

![screenshot](others/screenshot.png)
![demo](others/demo.gif)


## Getting started
Install the plugin from the community plugin list.
Make sure Daily Note core plugin is enabled.
In the command palette, choose "Daily Note Outline: Open Outline".

デイリーノートコアプラグインが有効になっていることを確かめて下さい。
本プラグインをcommunityプラグインリストからインストールし、有効化して下さい。
コマンドパレットから、「Daily Note Outline: Open Outline」を実行して下さい。

## How to use
To change the date range to display, click on the left and right arrows.
To return to the initial date range, click on the house icon.
Click on the refresh icon to redraw the outline, e.g., if you have changed the settings.
Click on each outline element to open its location.
Push Ctrl key to preview.
I recommend that you first set the display/hide settings for each outline element (headings, links, tags, and list items) in the settings.

表示する日付の範囲を変更したいときは、左右の矢印をクリックして下さい。
家のアイコンをクリックすると初期設定の範囲に戻ります。
設定を変更したときなど、再描画が必要なときは更新アイコンをクリックして下さい。
各アウトライン要素をクリックするとその場所を開きます。
各要素の上でCtrlキーを押すとホバープレビューを表示します。
使用にあたり、まず設定画面で各アウトライン要素（見出し、リンク、タグ、リスト項目）ごとに表示/非表示を設定することをお勧めします。

## simple filter / include / exclude
(I'm not good at English, so many of terms and explanations here might be difficult to understand. I would appreciate your feedback if the terminology or explanations are not correct!)
In order to hide unnecessary items and display only the necessary ones, three types of filter functions are implemented: Simple filter, Include, and Exclude.
Simple filter simply hides items that match a specified word or phrase. The hierarchy of items is not taken into account.
Include can be applied to only one type of outline element. It treats the range from the outline element of the specified type to the next similar element as a block, and only items matching the specified word or phrase and belonging to that block are displayed.
Conversely, Exclude hides matching items and their blocks. If you specify an element type in the "excluding ends at" section of the settings, or if Include is enabled, the block is considered to have ended at that element, and only that part of the block is hidden.
Include and Exclude can be used at the same time. (However, it does not make sense to specify the exclude keyword for an element type that is specified in Include.)
Simple filter can be used in conjunction with other filters. For example, if you specify the same keywords as those specified for Include, you can display only the elements that belong to the elements matched the include keywords, not the elements themselves.

不必要な項目を非表示にし、必要な項目のみ表示するために、simple filter, include, exclude の3つのフィルター機能を実装しています。
simple filterは、指定した単語やフレーズにマッチする項目を、単純に非表示にします。項目ごとの階層は考慮されません。
includeは、1種類のアウトライン要素のみに使えます。指定した種類のアウトライン要素から、次の同種要素までの間をひとつのブロックとして扱い、
指定した単語やフレーズにマッチする項目とそのブロックに属する項目のみを表示します。
逆に、excludeはマッチした項目とそのブロックのみを非表示にします。設定の「excluding ends at」のところで要素種別を指定するか、includeを有効にしていると、
その要素のところでブロックが終了したと判断され、そこまでが非表示になります。
includeとexcludeは同時に使用できます。（ただし、includeに指定した要素種別にexcludeキーワードを指定しても意味がありません。）
simple filterは他と併用できます。例えば、includeに指定したものと同じキーワードを指定すると、includeの対象になった要素自体は表示せず、それに属する要素のみを表示できます。


## Settings
### Basics
#### Initial search type
- backward(default)
	- Displays the past daily notes for the specified number of days starting from today.  今日を起点として指定した日数分の過去のデイリーノートを表示します。通常こちらで良いと思います。
- forward
	- Displays daily notes for the specified number of days starting from the date specified in Onset date. Onset dateで指定した日付を起点として、指定日数分のデイリーノートを表示します。
#### Search duration
Specify the number of days to be explored per page. It is recommended to set a shorter period for those who use Daily notes every day and a longer period for those who use it only occasionally. I would recommend about 7-56 days.
1ページあたりに探索するデイリーノートの期間を日で指定します。デイリーノートを頻繁に使用する人は短く、たまにしか使わない人は長く設定するといいと思います。7日~56日くらいでしょうか。

#### Include future daily notes
When backward search is used, daily notes of the specified number of days in the future are also displayed (If you set it long enough, you can also use this plugin as a list of upcoming events!).
サーチタイプがbackward search のとき、指定した日数分未来のデイリーノートも表示します。長くすれば将来のイベントのリストとしても使えます！

#### Onset date
For forward search, specify the date in YYYY-MM-DD format to start the search at startup.
Clicking on the date range under UI buttons jumps to the date.
サーチタイプがforward search のとき起動時に探索開始する日付をYYYY-MM-DDの形式で指定します。
また、UIボタンの下の日付範囲の表示をクリックしてもこの日にジャンプします。

#### Show headings / links / tags / list items 
Choose whether each element should be displayed in outline.
それぞれの要素をアウトラインとして表示するか指定します。

#### Show all root list items
With respect to list item, if this setting is off, it shows only the first item in a continuous list. When turned on, it displays all list items at root level.
リスト項目に関して、この設定がオフになっていると連続したリストの初めの項目だけを表示します。オンになっていると、ルートレベルの項目（＝インデントされていない項目）を全て表示します。

#### Display file information
Display file information to the right of each daily note file name.
lines: number of lines in the file
days: number of days since the base date (today for backward search, the date specified in Onset date for forward search)
ファイル名の右側に情報を表示します
lines: ファイルの行数
days: 基準日からの日数(backward searchでは今日、forward searchではforward searchで指定した日付)

### Headings
#### Heading level to display
Choose whether each level of headings should be displayed in outline.
各レベルの見出しをアウトラインとして表示するかそれぞれ指定します。

### Preview
#### Inline Preview
Show a few subsequent words next to each outline elements.
アウトライン要素の右に、続く数単語を表示します。

#### Tooltip Preview
Show subsequent sentences as a tooltip with mouse hover.
アウトライン要素にマウスカーソルを合わせると、続く文章をツールチップとして表示します。

#### Tooltip Preview direction
Specify the direction to display the tooltip preview.
(I couldn't find the way to automatically determine appropriate direction...)
ツールチッププレビューを表示する方向を指定します(自動で振り分けたかったけどやり方が分かりませんでした…)

#### Filter
If each outline element contains a specified word or phrase, that outline element will not be displayed.
Specify one per line.
指定した単語やフレーズが含まれるアウトライン要素は非表示になります。それぞれ改行で区切って下さい。

## Acknowledgement
In developing this plugin, I have use many great plugins in Obsidian community as references. In particular, 
[Daily note interface by @liamcain](https://github.com/liamcain/obsidian-daily-notes-interface) for processing daily notes.
[Spaced Repetition by @st3v3nmw](https://github.com/st3v3nmw/obsidian-spaced-repetition) and [Recent Files by @tgrosinger](https://github.com/tgrosinger/recent-files-obsidian) for creating custom views.
I also searched and referred to a bunch of posts in plugin-dev channel on Discord.

本プラグインの作成にあたり、多くの素晴らしいObsidianのプラグインを参考にさせて頂きました。特に、
デイリーノートの処理にdaily note interface by @liamcain を使わせて頂きました。
カスタムビューの作成にSpaced Repetition by st3v3nmwとRecent files by tgrosingerを大いに参考にさせて頂きました。
また、discordの plugin-devの書き込みを多数参考にさせて頂きました。

## (want) to do
- collapse a note
- better appearance
- note refactoring
- show linked mentions / created / modefied files on each day (feasible in terms of performance?)
- derivative plugin for other than daily notes

### done
- show number of lines of each note
- show the first section if no outline element exists
- UI button for change settings
- filter / include /exclude
- partially
	- better preview

## Changelog
- 0.4.0
	- New functions
		- Include / Exclude
			- you can include or exclude some outline elements with belonging elements
	- Improvements
		- after an update, the plugin now automatically open its view (no need to reopen from command pallete)
- 0.3.0
	- New functions
		- 2 new ways to preview
			- 1. Inline Preview
				- show a few subsequent words next to each outline element
			- 2. Tooltip Preview
				- show subsequent sentences as a tooltip with mouse hover
	- Improvements
		- added a UI button to open plugin setting
		- click on the date range to jump to Onset date(specified in the setting).
	- Fixed
		fixed long name items overflowing
- 0.2.0
	- New functions
		- filtering outline element by word or phrase
		- display some file information to the right of file name
		- show the first line of the file if it has no outline element
	- Improvements
		- hover preview now shows proper location of each element
- 0.1.1
	- Initial release.


