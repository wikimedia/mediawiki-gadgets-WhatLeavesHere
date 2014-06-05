/**
 * WhatLeavesHere v0.3.1
 * https://github.com/Krinkle/mw-gadget-whatleaveshere
 *
 * @license http://krinkle.mit-license.org/
 * @author Timo Tijhof, 2010–2014
 */
/*global mw */
( function ( $ ) {
	'use strict';

	var namespace, target, limit, msg, message, gmessage,
		conf = mw.config.get([
			'wgCanonicalNamespace',
			'wgCanonicalSpecialPageName',
			'wgFormattedNamespaces',
			'wgPageName',
			'wgSiteName',
			'wgTitle',
			'wgUserLanguage'
		]);

	function wrapListItem(nodes) {
		var li = document.createElement('li');
		$(li).append(nodes);
		return li;
	}

	/**
	 * Initialisation
	 */
	function init() {
		var optionHtml;

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
			// ' label for="limit">' + message('label-limit').escaped() + ':</label>&nbsp;' +
			// '<select id="mw-whatleaveshere-limit" name="limit" class="limitselector mw-limit-selector">' +
			//	'<option value="20">20</option><option value="50" selected="selected">50</option><option value="100">100</option><option value="250">250</option><option value="500">500</option>' +
			// '</select>' +
			' <input type="submit" value="' + message('button-submit').escaped() + '">' +
		'</fieldset>' +
	'</form>'
	);

			if ( mw.util.getParamValue( 'target' ) === null ) {
				$('#firstHeading').text( msg( 'title' ) );
			} else {
				// is htmlescaped already apparantly
				target = $.trim(mw.util.getParamValue('target').replace(/_/g, ' ').replace(/\+/g, ' '));
				namespace = mw.util.getParamValue('namespace') || null;
				limit = mw.util.getParamValue('limit') || null;

				$('#firstHeading').text(msg('title-leaveshere', target));
				$('#contentSub').prepend('&larr; <a href="' + mw.util.wikiScript() + '?title=' +
					mw.html.escape(encodeURIComponent(target)) + '&amp;redirect=no" title="' +
					mw.html.escape(target) + '">' + mw.html.escape(target)  + '</a>'
				);
				$('#mw-whatleaveshere-target').val(target);

				if ( namespace ) {
					$('#mw-whatleaveshere-namespace').val(namespace);
				}

				if ( limit ) {
					$('#mw-whatleaveshere-limit').val(limit);
				}

				$.ajax({
					type: 'GET',
					url: mw.util.wikiScript( 'api' ),
					data: {
						format: 'json',
						action: 'query',
						titles: target,
						prop: 'templates|images|links|extlinks|categories',
						tlnamespace: namespace,
						plnamespace: namespace,
						tllimit: 500,
						imlimit: 500,
						pllimit: 500,
						ellimit: 500,
						cllimit: 500
					},
					dataType: 'json'
				}).done( function ( data ) {
					var	key, page, isNew, redLinkAttr,
						$listLink, $listExternal, $listCats,
						links = [],
						extlinks = [],
						catlinks = [],
						hasResults = false;

					if ( !data || data.error || !data.query.pages ) {
						return;
					}

					for ( key in data.query.pages ) {
						page = data.query.pages[ key ];
						break;
					}

					if ( !page ) {
						return;
					}

					// Back-compat
					page.pagelinks = page.links;

					isNew = page.missing !== undefined;
					if ( isNew ) {
						$('#contentSub > a').eq(0).addClass( 'new' );
						redLinkAttr = ' class="new"';
					} else {
						redLinkAttr = '';
					}

					function handleLinks( type, i, link ) {
						var typeText;
						if ( type === 'template' ) {
							typeText = gmessage('parentheses', message('istemplate').text()).text();
						} else if ( type === 'file' ) {
							typeText = gmessage('parentheses', message('isfile').text()).text();
						} else {
							typeText = '';
						}

						links.push([
							$('<a>')
								.attr('href', mw.util.getUrl(link.title))
								.text(link.title)
								.get(0),
							' ' + typeText + ' ',
							$('<a>')
								.attr('href', mw.util.getUrl('Special:WhatLeavesHere', {
									target: link.title
								}))
								.text('← leaves')
								.get(0)
						]);
					}

					if ( page.templates ) {
						hasResults = true;
						$.each( page.templates, $.proxy(handleLinks, null, 'template') );
					}

					if ( page.images ) {
						hasResults = true;
						$.each( page.images, $.proxy(handleLinks, null, 'file') );
					}

					if ( page.pagelinks ) {
						hasResults = true;
						$.each( page.pagelinks, $.proxy(handleLinks, null, 'pagelink') );
					}

					if ( page.extlinks ) {
						hasResults = true;
						$.each( page.extlinks, function ( i, link ) {
							extlinks.push([
								$('<a>')
									.addClass('external')
									.attr('href', link['*'])
									.text(link['*'])
									.get(0),
								' ',
								$('<a>')
									.attr('href', mw.util.getUrl('Special:LinkSearch', {
										target: link['*']
									}))
									.text('← ' + msg('linksearch'))
									.get(0)
							]);
						} );
					}

					if ( page.categories ) {
						hasResults = true;
						$.each( page.categories, function ( i, link ) {
							catlinks.push([
								$('<a>')
									.attr('href', mw.util.getUrl(link['*']))
									.text(link['*'])
									.get(0),
								' ',
								$('<a>')
									.attr('href', mw.util.getUrl('Special:WhatLeavesHere', {
										target: link['*']
									}))
									.text('← leaves')
									.get(0)
							]);
						} );
					}

					if ( !hasResults ) {
						$('#bodyContent').append('<p>' +
							message('noleaveshere').escaped()
								.replace('$1',
									'<b><a href="' + mw.html.escape(mw.util.getUrl(target)) + '"' + redLinkAttr + '>' + mw.html.escape(target) + '</a></b>'
								) +
							'</p>'
						);
					} else {
						$('#bodyContent').append('<p>' +
							message('sub-leaveshere').escaped()
								.replace('$1',
									'<b><a href="' + mw.html.escape(mw.util.getUrl(target)) + '"' + redLinkAttr + '>' + mw.html.escape(target) + '</a></b>'
								) +
							'</p><hr>' +
							'<div class="toccolours toc" style="top: 20em; right: 1em; position: fixed;">' +
							'<h2>Contents</h2>' +
								'<ul>' +
								'<li><a href="#top">Links</a></li>' +
								'<li><a href="#mw-whatleaveshere-extlinks">External links</a></li>' +
								'<li><a href="#mw-whatleaveshere-catlinks">Categories</a></li>' +
								'</ul>' +
							'</div>' +
							'<ul id="mw-whatleaveshere-links-list"></ul>' +
							'<h3 id="mw-whatleaveshere-extlinks">External links</h3>' +
							'<ul id="mw-whatleaveshere-extlinks-list"></ul>' +
							'<h3 id="mw-whatleaveshere-catlinks">Categories</h3>' +
							'<ul id="mw-whatleaveshere-catlinks-list"></ul>'
						);
						$listLink = $('#mw-whatleaveshere-links-list').append($.map(links, wrapListItem));
						$listExternal = $('#mw-whatleaveshere-extlinks-list').append($.map(extlinks, wrapListItem));
						$listCats = $('#mw-whatleaveshere-catlinks-list').append($.map(catlinks, wrapListItem));
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

	$.when(
		mw.libs.getIntuition
			.then(function () {
				return mw.libs.intuition.load(['whatleaveshere', 'general']);
			})
			.then(function () {
				msg = $.proxy(mw.libs.intuition.msg, null, 'whatleaveshere');
				message = $.proxy(mw.libs.intuition.message, null, 'whatleaveshere');
				gmessage = $.proxy(mw.libs.intuition.message, null, 'general');
			}),
		mw.loader.using([
			'mediawiki.util'
		]),
		$.ready
	).done(init);

}( jQuery ) );
