# Obsidian Daily Note Outline
Daily notes are a good place to write down various little notes and thoughts. However, sometimes it can be difficult to find which daily note you wrote them in later.<br>
This plugin creates a custom view that displays the outlines of multiple daily notes at once. The outline can display not only headings, but also links, tags and list items.

デイリーノートはちょっとしたメモや雑多な考えを書き留めるのに便利です。しかし、後からどこに書いたのか探すのに苦労することがあります。<br>
このプラグインは、サイドペインに複数のデイリーノートのアウトラインを一括表示して、デイリーノートに書いた内容を把握しやすくするためのものです。見出しだけでなくリンク、タグ、リスト項目なども表示できます。

![screenshot](others/screenshot.png)
![demo](others/demo.gif)


## Getting started
Install the plugin from the community plugin list.<br>
Make sure Daily Note core plugin is enabled.<br>
To display the outline, choose "Daily Note Outline: Open Outline" in the command pallete.<br>

デイリーノートコアプラグインが有効になっていることを確かめて下さい。<br>
本プラグインをcommunityプラグインリストからインストールし、有効化して下さい。<br>
アウトラインが表示されていない場合は、コマンドパレットから、「Daily Note Outline: Open Outline」を実行して下さい。<br>

## How to use
To change the date range to display, click on the left and right arrows.<br>
To return to the initial date range, click on the house icon.<br>
Click on the refresh icon to redraw the outline, e.g., if you have changed the settings.<br>
Click on each outline element to open its location.<br>
Push Ctrl key to preview.<br>
I recommend that you first set the display/hide settings for each outline element (headings, links, tags, and list items) in the settings.

表示する日付の範囲を変更したいときは、左右の矢印をクリックして下さい。<br>
家のアイコンをクリックすると初期設定の範囲に戻ります。<br>
設定を変更したときなど、再描画が必要なときは更新アイコンをクリックして下さい。<br>
各アウトライン要素をクリックするとその場所を開きます。<br>
各要素の上でCtrlキーを押すとホバープレビューを表示します。<br>
使用にあたり、まず設定画面で各アウトライン要素（見出し、リンク、タグ、リスト項目）ごとに表示/非表示を設定することをお勧めします。

## Feature
### Simple filter / Include / Exclude

In order to hide unnecessary items and display only the necessary ones, three types of filter functions are implemented: **Simple filter**, **Include**, and **Exclude**.

**Simple filter** simply hides items that match a specified word or phrase. The hierarchy of items is not taken into account.<br>
**Include** can be applied to only one type of outline element. It treats the range from the outline element of the specified type to the next similar element as a block, and only items matching the specified word or phrase and belonging to that block are displayed.<br>
Conversely, **Exclude** hides matching items and their blocks. If you specify an element type in the "excluding ends at" section of the settings, or if Include is enabled, the block is considered to have ended at that element, and only that part of the block is hidden.

**Include** and **Exclude** can be used at the same time. (However, it does not make sense to specify the exclude keyword for an element type that is specified in Include.)
**Simple filter** can be used in conjunction with other filters. For example, if you specify the same keywords as those specified for Include, you can display only the elements that belong to the elements matched the include keywords, not the elements themselves.

不必要な項目を非表示にし、必要な項目のみ表示するために、simple filter, include, exclude の3つのフィルター機能を実装しています。<br>
simple filterは、指定した単語やフレーズにマッチする項目を、単純に非表示にします。項目ごとの階層は考慮されません。<br>
includeは、1種類のアウトライン要素のみに使えます。指定した種類のアウトライン要素から、次の同種要素までの間をひとつのブロックとして扱い、
指定した単語やフレーズにマッチする項目とそのブロックに属する項目のみを表示します。<br>
逆に、excludeはマッチした項目とそのブロックのみを非表示にします。設定の「excluding ends at」のところで要素種別を指定するか、includeを有効にしていると、
その要素のところでブロックが終了したと判断され、そこまでが非表示になります。<br>
includeとexcludeは同時に使用できます。（ただし、includeに指定した要素種別にexcludeキーワードを指定しても意味がありません。）<br>
simple filterは他と併用できます。例えば、includeに指定したものと同じキーワードを指定すると、includeの対象になった要素自体は表示せず、それに属する要素のみを表示できます。

### Extract
You can extract only outline elements that contain a specific words. There are three ways to do this.<br>

1. Click on the magnifying glass button and type in the string you want to extract.<br>
2. Right-click on the outline element and select 'extract' from the context menu. Only elements containing the same name will be extracted.<br>
3. Right-click on the magnifying glass button and choose 'extract tasks'. Only list items that have checkbox will be extracted.<br>
Items that have been hidden by filtering or other means will not be displayed.<br>
To cancel the extraction, click the X button (the magnifying glass button will change to an X button).<br>

特定の文字列を含むアウトライン要素のみを抽出できます。方法は3つあります。<br>
1．虫眼鏡ボタンをクリックし、抽出したい文字列を入力して下さい。<br>
2．アウトライン要素を右クリックし、コンテキストメニューからextractを選択して下さい。同じ名前を含むアウトライン要素のみが抽出されます。<br>
3．虫眼鏡ボタンをクリックし、extract tasksを選択して下さい。タスク(チェックボックスを含むリストアイテム)のみが抽出されます。<br>

もともとfilterなどにより非表示になっている項目は表示されません。<br>
抽出を解除するときは、×ボタン(虫眼鏡ボタンが×ボタンに変化します)をクリックして下さい。<br>

## Settings
Some child items are not initially displayed and will appear when the parent item is turned on.

一部の子項目は初期状態では表示されず、親項目がオンになったときに表示されます。
### Basics
#### Initial search type
- backward(default)
	- Displays the past daily notes for the specified number of days starting from today.<br>  今日を起点として指定した日数分の過去のデイリーノートを表示します。通常こちらで良いと思います。
- forward
	- Displays daily notes for the specified number of days starting from the date specified in Onset date.<br> Onset dateで指定した日付を起点として、指定日数分のデイリーノートを表示します。

#### Include future daily notes
When backward search is used, daily notes of the specified number of days in the future are also displayed (If you set it long enough, you can also use this plugin as a list of upcoming events!).

サーチタイプがbackward search のとき、指定した日数分未来のデイリーノートも表示します。長くすれば将来のイベントのリストとしても使えます！

#### Onset date
For forward search, specify the date in YYYY-MM-DD format to start the search at startup.<br>
Clicking on the date range under UI buttons jumps to the date.

サーチタイプがforward search のとき起動時に探索開始する日付をYYYY-MM-DDの形式で指定します。<br>
また、UIボタンの下の日付範囲の表示をクリックしてもこの日にジャンプします。

#### Search duration
Specify the number of days to be explored per page. It is recommended to set a shorter period for those who use Daily notes every day and a longer period for those who use it only occasionally. I would recommend about 7-56 days.

1ページあたりに探索するデイリーノートの期間を日で指定します。デイリーノートを頻繁に使用する人は短く、たまにしか使わない人は長く設定するといいと思います。7日~56日くらいでしょうか。

#### Show headings / links / tags / list items & tasks 
Choose whether each element should be displayed in outline.

それぞれの要素をアウトラインとして表示するか指定します。

#### Show all root list items
With respect to list item, if this setting is off, it shows only the first item in a continuous list. When turned on, it displays all list items at root level.

リスト項目に関して、この設定がオフになっていると連続したリストの初めの項目だけを表示します。オンになっていると、ルートレベルの項目（＝インデントされていない項目）を全て表示します。

#### Show all tasks / Tasks only / Hide completed tasks
Display setting for tasks (list items including checkboxes).
Show all tasks will show all levels of tasks, regardless of the list settings above; Task only will hide all list items except for tasks; Hide completed tasks will hide completed tasks.
タスク(チェックボックスを含むリストアイテム)についての表示設定です。Show all tasksをオンにすると、上のリスト設定にかかわらず、全ての階層のタスクを表示します。Task onlyをオンにするとタスク以外のリストが非表示になります。Hide completed tasksは完了済みタスクを非表示にします。

#### Display file information
Display file information to the right of each daily note file name.<br>
lines: number of lines in the file<br>
days: number of days since the base date (today for backward search, the date specified in Onset date for forward search)

ファイル名の右側に情報を表示します<br>
lines: ファイルの行数<br>
days: 基準日からの日数(backward searchでは今日、forward searchではforward searchで指定した日付)

#### Position of the plugin view
Specify where to display the plugin's view when redisplaying or updating.
(You can specify other than the left and right sidebars, but the behavior may not be as sophisticated.)
再表示やアップデートの際に、どこにviewを表示するかを指定します。
左右のサイドバー以外も指定できますが、動作は洗練されていないかもしれません。

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
Specify the direction to display the tooltip preview.<br>
(I couldn't find the way to automatically determine appropriate direction...)

ツールチッププレビューを表示する方向を指定します(自動で振り分けたかったけどやり方が分かりませんでした…)

### Simple filter
#### Headings/Links/Tags/List items to ignore
If each outline element contains a specified word or phrase, that outline element will not be displayed.<br>
Specify one per line.

指定した単語やフレーズが含まれるアウトライン要素は非表示になります。それぞれ改行で区切って下さい。

### Include
#### Element type for include
Specifies the type of outline element to apply the Include filter to.

指定したアウトライン要素の種別がIncludeフィルターの対象になります。

#### Words to include
Only outline elements containing the specified word or phrase and the block following it will be displayed.
Each should be separated by a new line.

指定した単語やフレーズが含まれるアウトライン要素と、それに続くブロックのみが表示対象となります。
それぞれ改行で区切って下さい。

#### Include the beginning part
Specifies whether the beginning part of a note that precedes the appearance of the outline element specified in Element type for include is to be displayed.

ノートの冒頭で、Element type for includeで指定したタイプのアウトライン要素が登場するより前の部分を表示対象とするかどうか指定します。

### Exclude
#### Exclusion end at
If any of the outline element types is specified in this field, the area excluded by Exclude filter is terminated at the specified element.
If any type is specified in Include filter, Exclude is terminated at that type and this field is ignored.

この項目でいずれかのアウトライン要素タイプを指定した場合、Excludeフィルターによって除外される領域が指定した要素のところで打ち切られます。
Includeフィルターでいずれかのタイプが指定されていた場合、そのタイプのところでExcludeは打ち切られ、この項目は無視されます。

#### Headings/ Links/ Tags/ List items to exclude
The outline element containing the specified word or phrase and the area following it will be hidden.
Each should be separated by a new line.

指定した単語やフレーズが含まれるアウトライン要素と、それに続く領域(同種のアウトライン要素、またはExclusion end atで指定した要素が出現する前までの領域)は非表示になります。
それぞれ改行で区切って下さい。

### Appearance
Sets the appearance of each outline element when it is displayed.
An icon and prefix string can be added to each element.
If you choose 'custom' for icon, enter icon name of the Lucide icon (https://lucide.dev/ ) in 'Custom icon' field. Some icons do not seem to be able to be displayed.

それぞれのアウトライン要素を表示する際の見た目を設定します。
各要素にはアイコンおよびprefix文字列を付加することができます。
アイコンでcustomを選んだ場合、Lucide (https://lucide.dev/ )のアイコン名を入力して下さい。一部のアイコンは表示できないようです。

#### Headings: Repeat heading prefix
If you enter a prefix for headings, turning this item on will repeat the prefix for the number of levels of headings.

headingsのprefixを入力した場合、この項目をオンにすると、見出しのレベルの数だけprefixが繰り返されます。

#### Headings: Add indent
Indentation is added according to the level of the heading.

見出しのレベルに応じてインデントを付加します。

#### Tasks: Add checkbox text to prefix
Append a string indicating the status of the checkbox to the end of the task prefix.

タスクのprefixの最後にcheckboxの状態を示す文字列を付加します。

## Acknowledgement
In developing this plugin, I have use many great plugins in Obsidian community as references. In particular, <br>
[Daily note interface by @liamcain](https://github.com/liamcain/obsidian-daily-notes-interface) for processing daily notes.<br>
[Spaced Repetition by @st3v3nmw](https://github.com/st3v3nmw/obsidian-spaced-repetition) and [Recent Files by @tgrosinger](https://github.com/tgrosinger/recent-files-obsidian) for creating custom views.<br>
I also searched and referred to a bunch of posts in plugin-dev channel on Discord.

本プラグインの作成にあたり、多くの素晴らしいObsidianのプラグインを参考にさせて頂きました。特に、<br>
デイリーノートの処理にdaily note interface by @liamcain を使わせて頂きました。<br>
カスタムビューの作成にSpaced Repetition by st3v3nmwとRecent files by tgrosingerを大いに参考にさせて頂きました。<br>
また、discordの plugin-devの書き込みを多数参考にさせて頂きました。

## (want) to do
- collapse a note
- support for periodic notes
- note refactoring
- show linked mentions / created / modefied files on each day (feasible in terms of performance?)
- derivative plugin for other than daily notes

### done
- show number of lines of each note
- show the first section if no outline element exists
- UI button for change settings
- simple filter / include /exclude / extract
- partially
	- better preview

## Changelog
- 0.6.0
	- New functions
		- Now task(checkbox) is treated separately from list items
			- you can extract only tasks by right clicking Extract icon
		- Change the appearance of each element (Setting)
	- Improvements
		- From the context menu, you can open the outline element in a new tab, splitted pane, or popout window
		- In the settings, the dependent items are now hidden when the primary item is off.
		- Extraction modal accepts Enter key
	- Fixed
		- Fiexed the extraction function failing in some situations

- 0.5.0
	- Important fix
		- Fixed overload observed in mobile version under certain situation. Please let me know if the problem persists.
	- New function
		- Extract
			- you can extract outline elements including specific words
				1. click magnifying glass UI button and input words to extract
				2. right click on an outline element and choose 'extract' in the context menu. Then only elements with same name will be displayed.
				3. To finish extract, click unextract UI button
	- Improvements
		- added a UI button to create/open today's daily note
			- right click on the button shows the context menu to create tomorrow's daily note
		- you can choose default position where this plugin's view appears from the settings.

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

