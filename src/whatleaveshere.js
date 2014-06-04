/**
 * WhatLeavesHere v0.3.1
 * https://github.com/Krinkle/mw-gadget-whatleaveshere
 *
 * @license http://krinkle.mit-license.org/
 * @author Timo Tijhof, 2010–2014
 */
/*global mw*/
( function ( $ ) {
	'use strict';

	var	namespace, target, limit, msg, message,
		initiated = false,
		conf = mw.config.get([
			'wgCanonicalNamespace',
			'wgCanonicalSpecialPageName',
			'wgFormattedNamespaces',
			'wgPageName',
			'wgSiteName',
			'wgTitle',
			'wgUserLanguage'
		]);

	// Explode with limit
	function krExplode( delimiter, string, limit ) {
		var splitted, partA, partB;
		if ( !limit ) {
			return string.split( delimiter );
		} else {
			// support for limit argument
			splitted = string.split( delimiter );
			partA = splitted.splice( 0, limit - 1 );
			partB = splitted.join( delimiter );
			partA.push( partB );
			return partA;
		}
	}

	/**
	 * Main application
	 */
	function init() {
		var optionHtml;

		// Prevent loading twice
		if ( initiated ) {
			return;
		}

		initiated = true;

		// Only initialise if we're on [[Special:WhatLeavesHere]]
		// Can't use wgCanonicalSpecialPageName, since this is a non-existing special page
		if ( conf.wgCanonicalNamespace === 'Special' &&  conf.wgTitle === 'WhatLeavesHere' ) {

			// Initialise page
			document.title = msg('title') + ' - ' +  conf.wgSiteName;

			optionHtml = '';
			$.each( conf.wgFormattedNamespaces, function ( nsId, nsName ) {
				if ( Number( nsId ) >= 0 ) {
					optionHtml += mw.html.element(
						'option', {
							value: nsId
						},
						nsId === '0' ? '(Main)' : nsName
					);
				}
			} );

			$('#bodyContent').html(
	'<div id="contentSub"></div><form action="/wiki/Special:WhatLeavesHere" method="get">' +
		'<fieldset>' +
			'<legend>' + message('title').escaped() + '</legend>' +
			'<label for="mw-whatleaveshere-target">' + message('label-page').escaped() + ':</label>&nbsp;<input name="target" size="40" value="" id="mw-whatleaveshere-target">' +
			' <label for="namespace">' + message('label-namespace').escaped() + ':</label>&nbsp;' +
			'<select id="mw-whatleaveshere-namespace" name="namespace" class="namespaceselector mw-namespace-selector">' +
				'<option value="" selected="selected">all</option>' + optionHtml +
			'</select>' +
			' <!-- <label for="limit">' + message('label-limit').escaped() + ':</label>&nbsp;' +
			'<select id="mw-whatleaveshere-limit" name="limit" class="limitselector mw-limit-selector">' +
				'<option value="20">20</option><option value="50" selected="selected">50</option><option value="100">100</option><option value="250">250</option><option value="500">500</option>' +
			'</select> -->' +
			' <input type="submit" value="' + message('button-submit').escaped() + '">' +
		'</fieldset>' +
	'</form>'
	);

			if ( mw.util.getParamValue( 'target' ) === null ) {
				$('#firstHeading').text( msg( 'title' ) );
			} else {
				// is htmlescaped already apparantly
				target = $.trim(mw.util.getParamValue('target').replace(/_/g, ' ').replace(/\+/g, ' '));
				namespace = mw.util.getParamValue('namespace');
				limit = mw.util.getParamValue('limit');

				$('#firstHeading').text(msg('title-leaveshere', target));
				$('#contentSub').prepend('&larr; <a href="' + mw.util.wikiScript() + '?title=' +
					mw.html.escape(encodeURIComponent(target)) + '&amp;redirect=no" title="' +
					mw.html.escape(target) + '">' + mw.html.escape(target)  + '</a>'
				);
				$('#mw-whatleaveshere-target').val( $.trim( target ) );

				if ( namespace ) {
					$('#mw-whatleaveshere-namespace').val( String( namespace ) );
					namespace = '&tlnamespace=' + namespace + '&plnamespace=' + namespace;
				} else {
					namespace = '';
				}
				if ( limit ) {
					$('#mw-whatleaveshere-limit').val( String( limit ) );
				}

				$.ajax({
					type: 'GET',
					url: mw.util.wikiScript( 'api' ),
					data: 'format=xml&action=query&titles=' + target + '&prop=templates|categories|extlinks|images|links' + namespace + '&tllimit=500&cllimit=500&ellimit=500&imlimit=500&pllimit=500',
					timeout: 1000,
					dataType: 'xml'
				}).done( function ( data ) {
					var	aTitle, bTitle, $data_page, page_is_new, $data,
						title, suffix, leavelink, $list_link, $list_external, $list_cats;

					// Dril down to the info of this page, then to all groups (*: categories, images, links etc.)
					$data_page = $(data).find( 'pages > page[title="' + target + '"]' );
					page_is_new = $data_page.is( '[missing=""]' );
					if ( page_is_new ) {
						$('#contentSub > a').eq(0).addClass( 'new' );
						page_is_new = $data_page.is( '[missing=""]' ) ? ' class="new"' : '';
					}
					// Get all the children then sort them
					$data = $data_page.find(' > *').children().sort(function (a, b) {
						// sort by fullpagename
						//return a.title > b.title ? 1 : -1;

						// sort by title, not by fullpagename (minus namespace)
						if ( a.getAttribute('ns') === null ) {
							return 0;
						} else if (a.getAttribute('ns') === '0') {
							aTitle = a.getAttribute('title');
						} else {
							aTitle = krExplode(':', a.getAttribute('title'), 2)[1];
						}
						if (b.getAttribute('ns') === null ) {
							return 0;
						} else if (b.getAttribute('ns') === '0') {
							bTitle = b.getAttribute('title');
						} else {
							bTitle = krExplode(':', b.getAttribute('title'), 2)[1];
						}
						return aTitle > bTitle ? 1 : -1;
					});

					if ( $data.length  ) {
						$('#bodyContent').append('<p>' + message('sub-leaveshere').escaped().replace('$1', '<b><a href="' + mw.html.escape(mw.util.getUrl(target)) + '"' + page_is_new + '>' + target + '</a></b>') + '</p><hr /><div class="toccolours toc" style="top:20em;right:1em;position:fixed"><h2>Contents</h2><ul><li><a href="#top">Links</a></li><li><a href="#mw-whatleaveshere-head-external">External links</a></li><li><a href="#mw-whatleaveshere-head-cats">Categories</a></li></ul></div><ul id="mw-whatleaveshere-list-link"></ul><h3 id="mw-whatleaveshere-head-external">External links</h3><ul id="mw-whatleaveshere-list-external"></ul><h3 id="mw-whatleaveshere-head-cats">Categories</h3><ul id="mw-whatleaveshere-list-cats"></ul>');
						$list_link = $('#mw-whatleaveshere-list-link');
						$list_external = $('#mw-whatleaveshere-list-external');
						$list_cats = $('#mw-whatleaveshere-list-cats');
						$data.each(function () {
							if ( $(this).is('el') ) {
								title = $(this).text();
								var extlinksearch = '(<a href="' + mw.util.getUrl('Special:LinkSearch') + '?target=' + mw.html.escape(mw.util.wikiUrlencode(title)) + '">&larr; ' +  message('linksearch').escaped() + '</a>)';
								$list_external.append('<li><a class="external" href="' + mw.html.escape(title) + '">' + mw.html.escape(title) + '</a> ' + extlinksearch + '</li>');
							} else if ( $(this).is('cl') ) {
								title = $(this).attr('title');
								leavelink = '(<a href="' + mw.util.getUrl('Special:WhatLeavesHere') + '?target=' + mw.html.escape(mw.util.wikiUrlencode(title)) + '">&larr; leaves</a>)';
								$list_cats.append('<li><a href="' + mw.util.getUrl(title) + '">' + title + '</a> ' + leavelink + '</li>');
								return true;
							} else {
								title = $(this).attr('title');
								leavelink = '(<a href="' + mw.util.getUrl('Special:WhatLeavesHere') + '?target=' + mw.html.escape(mw.util.wikiUrlencode(title)) + '">&larr; leaves</a>)';
								if ( $(this).is('tl') ) {
									suffix = ' (' + message('istemplate').escaped() + ') ' + leavelink;
								} else if ( $(this).is('im') ) {
									suffix = ' (' + message('isfile').escaped() + ') ' + leavelink;
								} else { // is <pl>
									suffix = ' ' + leavelink;
								}
								$list_link.append('<li><a href="' + mw.util.getUrl(title) + '">' + title + '</a>' + suffix + '</li>');
							}
						});
					} else {
						$('#bodyContent').append('<p>' + message('noleaveshere').escaped().replace('$1', '<b><a href="' + mw.html.escape(mw.util.getUrl(target)) + '"' + page_is_new + '>' + target + '</a></b>') + '</p>');
					}
				});
			}

		} else if ( conf.wgCanonicalNamespace !== 'Special' ) {
			mw.util.addPortletLink(
				'p-tb',
				mw.util.getUrl('Special:WhatLeavesHere') + '?target=' +  conf.wgPageName,
				msg('link-whatleaveshere'),
				't-whatleaveshere',
				msg('tooltip-whatleaveshere'),
				false,
				'#t-whatlinkshere'
			);
		} else if ( conf.wgCanonicalSpecialPageName === 'Whatlinkshere' ) {
			$('#bodyContent form fieldset legend')
				.append(' / <a href="' + mw.util.getUrl('Special:WhatLeavesHere') + '?target=' +
					mw.util.wikiUrlencode($('#mw-whatlinkshere-target').val()) + '">' + message('whatlinkshere-whatleaveshere').escaped() + '</a>'
				);
		} else if ( conf.wgCanonicalSpecialPageName === 'Specialpages' ) {
			$('#mw-specialpagesgroup-pagetools').next().find('td ul').eq(1)
				.prepend('<li><a href="' + mw.util.getUrl('Special:WhatLeavesHere') + '">' + message('title').escaped() + '</a></li>');
		}
	}

	if (!mw.libs.getIntuition) {
		mw.libs.getIntuition = $.ajax({ url: '//tools.wmflabs.org/intuition/load.php?env=mw', dataType: 'script', cache: true });
	}

	mw.libs.getIntuition
		.then(function () {
			return mw.libs.intuition.load('whatleaveshere');
		})
		.then(function () {
			msg = $.proxy(mw.libs.intuition.msg, null, 'whatleaveshere');
			message = $.proxy(mw.libs.intuition.message, null, 'whatleaveshere');
		})
		.done(init);

}( jQuery ) );
