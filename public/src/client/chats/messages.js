'use strict';


define('forum/chats/messages', [
	'components', 'hooks', 'bootbox', 'alerts',
	'messages', 'api', 'forum/topic/images', 'imagesloaded',
], function (
	components, hooks, bootbox, alerts, messagesModule, api, images, imagesLoaded
) {
	const messages = {};

	messages.sendMessage = async function (roomId, inputEl) {
		let message = inputEl.val();
		if (!message.trim().length) {
			return;
		}
		const chatContent = inputEl.parents(`[component="chat/messages"][data-roomid="${roomId}"]`);
		inputEl.val('').trigger('input');

		const chatComposer = inputEl.parents('[component="chat/composer"]');
		messages.updateRemainingLength(chatComposer);
		messages.updateTextAreaHeight(chatContent);
		const payload = { roomId, message };
		({ roomId, message } = await hooks.fire('filter:chat.send', payload));
		const replyToEl = chatComposer.find('[component="chat/composer/replying-to"]');
		const toMid = replyToEl.attr('data-tomid');

		api.post(`/chats/${roomId}`, { message, toMid: toMid}).then(() => {
			hooks.fire('action:chat.sent', { roomId, message });
			replyToEl.addClass('hidden');
			replyToEl.attr('data-tomid', '');
		}).catch((err) => {
			inputEl.val(message).trigger('input');
			messages.updateRemainingLength(chatComposer);
			messages.updateTextAreaHeight(chatContent);
			if (err.message === '[[error:email-not-confirmed-chat]]') {
				return messagesModule.showEmailConfirmWarning(err.message);
			}

			alerts.alert({
				alert_id: 'chat_spam_error',
				title: '[[global:alert.error]]',
				message: err.message,
				type: 'danger',
				timeout: 10000,
			});
		});
	};

	messages.updateRemainingLength = function (parent) {
		const element = parent.find('[component="chat/input"]');
		parent.find('[component="chat/message/length"]').text(element.val().length);
		const remainingLength = config.maximumChatMessageLength - element.val().length;
		parent.find('[component="chat/message/remaining"]').text(remainingLength)
			.toggleClass('fw-bold text-danger', remainingLength < 0)
			.toggleClass('text-muted', remainingLength >= 0);
		hooks.fire('action:chat.updateRemainingLength', {
			parent: parent,
		});
	};

	messages.updateTextAreaHeight = function (chatContentEl) {
		const textarea = chatContentEl.find('[component="chat/input"]');
		textarea.css({ height: messages.calcAutoTextAreaHeight(textarea) + 'px' });
	};

	messages.calcAutoTextAreaHeight = function (textarea) {
		const scrollHeight = textarea.prop('scrollHeight');
		const borderTopWidth = parseFloat(textarea.css('border-top-width'), 10) || 0;
		const borderBottomWidth = parseFloat(textarea.css('border-bottom-width'), 10) || 0;
		return scrollHeight + borderTopWidth + borderBottomWidth;
	};

	function autoresizeTextArea(textarea) {
		textarea.css({ height: messages.calcAutoTextAreaHeight(textarea) + 'px' });
		textarea.on('input', function () {
			textarea.css({ height: 0 });
			textarea.css({ height: messages.calcAutoTextAreaHeight(textarea) + 'px' });
		});
	}

	messages.appendChatMessage = function (chatContentEl, data) {
		const lastMsgEl = chatContentEl.find('.chat-message').last();
		const lastSpeaker = parseInt(lastMsgEl.attr('data-uid'), 10);
		const lasttimestamp = parseInt(lastMsgEl.attr('data-timestamp'), 10);
		if (!Array.isArray(data)) {
			data.newSet = data.toMid || lastSpeaker !== parseInt(data.fromuid, 10) ||
				parseInt(data.timestamp, 10) > parseInt(lasttimestamp, 10) + (1000 * 60 * 3);
			data.index = parseInt(lastMsgEl.attr('data-index'), 10) + 1;
		}

		messages.parseMessage(data, function (html) {
			onMessagesParsed(chatContentEl, html, data);
		});
	};

	function onMessagesParsed(chatContentEl, html, msgData) {
		const newMessage = $(html);
		const isAtBottom = messages.isAtBottom(chatContentEl);
		newMessage.addClass('new');
		newMessage.appendTo(chatContentEl);
		messages.onMessagesAddedToDom(newMessage);
		if (isAtBottom || msgData.self) {
			messages.scrollToBottomAfterImageLoad(chatContentEl);
			// remove some message elements if there are too many
			const chatMsgEls = chatContentEl.find('[data-mid]');
			if (chatMsgEls.length > 150) {
				const removeCount = chatMsgEls.length - 150;
				chatMsgEls.slice(0, removeCount).remove();
				chatContentEl.find('[data-mid].new').removeClass('new');
			}
		}

		hooks.fire('action:chat.received', {
			messageEl: newMessage,
		});
	}

	messages.onMessagesAddedToDom = function (messageEls) {
		messageEls.find('.timeago').timeago();
		messageEls.find('img:not(.not-responsive)').addClass('img-fluid');
		messageEls.find('img:not(.emoji)').each(function () {
			images.wrapImageInLink($(this));
		});
		hooks.fire('action:chat.onMessagesAddedToDom', { messageEls });
	};

	messages.parseMessage = function (data, callback) {
		const tplData = {
			messages: data,
			isAdminOrGlobalMod: app.user.isAdmin || app.user.isGlobalMod,
		};
		if (Array.isArray(data)) {
			app.parseAndTranslate('partials/chats/messages', tplData).then(callback);
		} else {
			app.parseAndTranslate('partials/chats/' + (data.system ? 'system-message' : 'message'), tplData).then(callback);
		}
	};

	messages.isAtBottom = function (containerEl, threshold) {
		if (containerEl.length) {
			const distanceToBottom = containerEl[0].scrollHeight - (
				containerEl.outerHeight() + containerEl.scrollTop()
			);
			return distanceToBottom < (threshold || 100);
		}
	};
	messages.scrollToBottomAfterImageLoad = function (containerEl) {
		if (containerEl && containerEl.length) {
			const msgBodyEls = containerEl[0].querySelectorAll('[component="chat/message/body"]');
			imagesLoaded(msgBodyEls, () => {
				messages.scrollToBottom(containerEl);
			});
		}
	};

	messages.scrollToBottom = function (containerEl) {
		if (containerEl && containerEl.length) {
			containerEl.attr('data-ignore-next-scroll', 1);
			containerEl.scrollTop(containerEl[0].scrollHeight - containerEl.height());
			containerEl.parents('[component="chat/message/window"]')
				.find('[component="chat/messages/scroll-up-alert"]')
				.addClass('hidden');
		}
	};

	messages.wrapImagesInLinks = function (containerEl) {
		containerEl.find('[component="chat/message/body"] img:not(.emoji)').each(function () {
			images.wrapImageInLink($(this));
		});
	};

	messages.toggleScrollUpAlert = function (containerEl) {
		const isAtBottom = messages.isAtBottom(containerEl, 300);
		containerEl.parents('[component="chat/message/window"]')
			.find('[component="chat/messages/scroll-up-alert"]')
			.toggleClass('hidden', isAtBottom);
	};

	messages.prepReplyTo = async function (msgEl, chatMessageWindow) {
		const chatContent = chatMessageWindow.find('[component="chat/message/content"]');
		const composerEl = chatMessageWindow.find('[component="chat/composer"]');
		const mid = msgEl.attr('data-mid');
		const replyToEl = composerEl.find('[component="chat/composer/replying-to"]');
		replyToEl.attr('data-tomid', mid)
			.find('[component="chat/composer/replying-to-text"]')
			.translateText(`[[modules:chat.replying-to, ${msgEl.attr('data-displayname')}]]`);
		replyToEl.removeClass('hidden');
		replyToEl.find('[component="chat/composer/replying-to-cancel"]').off('click')
			.on('click', () => {
				replyToEl.attr('data-tomid', '');
				replyToEl.addClass('hidden');
			});

		if (chatContent.length && messages.isAtBottom(chatContent)) {
			messages.scrollToBottom(chatContent);
		}
		composerEl.find('[component="chat/input"]').trigger('focus');
	};

	messages.prepEdit = async function (msgEl, mid, roomId) {
		const { content: raw } = await api.get(`/chats/${roomId}/messages/${mid}/raw`);
		const editEl = await app.parseAndTranslate('partials/chats/edit-message', {
			rawContent: raw,
		});
		const messageBody = msgEl.find(`[component="chat/message/body"]`);
		const messageControls = msgEl.find(`[component="chat/message/controls"]`);
		const chatContent = messageBody.parents('[component="chat/message/content"]');

		const isAtBottom = messages.isAtBottom(chatContent);
		messageBody.addClass('hidden');
		messageControls.addClass('hidden');
		editEl.insertAfter(messageBody);

		const textarea = editEl.find('textarea');

		textarea.focus().putCursorAtEnd();
		autoresizeTextArea(textarea);

		if (chatContent.length && isAtBottom) {
			messages.scrollToBottom(chatContent);
		}

		const chats = await app.require('forum/chats');
		const autoCompleteEl = chats.createAutoComplete(0, textarea, {
			placement: 'bottom',
		});

		function finishEdit() {
			messageBody.removeClass('hidden');
			messageControls.removeClass('hidden');
			editEl.remove();
			if (autoCompleteEl) {
				autoCompleteEl.destroy();
			}
		}
		textarea.on('keyup', (e) => {
			if (e.key === 'Escape') {
				finishEdit();
			}
		});
		editEl.find('[data-action="cancel"]').on('click', finishEdit);

		editEl.find('[data-action="save"]').on('click', function () {
			const message = textarea.val();
			if (!message.trim().length) {
				return;
			}
			api.put(`/chats/${roomId}/messages/${mid}`, { message }).then(() => {
				finishEdit();
				hooks.fire('action:chat.edited', { roomId, message, mid });
			}).catch((err) => {
				textarea.val(message).trigger('input');
				alerts.error(err);
			});
		});

		hooks.fire('action:chat.prepEdit', {
			msgEl: msgEl,
			messageId: mid,
			roomId: roomId,
			editEl: editEl,
			messageBody: messageBody,
		});
	};

	messages.addSocketListeners = function () {
		socket.removeListener('event:chats.edit', onChatMessageEdited);
		socket.on('event:chats.edit', onChatMessageEdited);

		socket.removeListener('event:chats.delete', onChatMessageDeleted);
		socket.on('event:chats.delete', onChatMessageDeleted);

		socket.removeListener('event:chats.restore', onChatMessageRestored);
		socket.on('event:chats.restore', onChatMessageRestored);
	};

	function onChatMessageEdited(data) {
		data.messages.forEach(function (message) {
			const self = parseInt(message.fromuid, 10) === parseInt(app.user.uid, 10);
			message.self = self ? 1 : 0;
			messages.parseMessage(message, function (html) {
				const msgEl = components.get('chat/message', message.mid);
				if (msgEl.length) {
					const componentsToReplace = [
						'[component="chat/message/body"]',
						'[component="chat/message/edited"]',
					];
					componentsToReplace.forEach((cmp) => {
						msgEl.find(cmp).replaceWith(html.find(cmp));
					});
					messages.onMessagesAddedToDom(components.get('chat/message', message.mid));
				}
				const parentEl = $(`[component="chat/message/parent"][data-parent-mid="${message.mid}"]`);
				if (parentEl.length) {
					parentEl.find('[component="chat/message/parent/content"]').html(
						html.find('[component="chat/message/body"]').html()
					);
					messages.onMessagesAddedToDom(
						$(`[component="chat/message/parent"][data-parent-mid="${message.mid}"]`)
					);
				}
			});
		});
	}

	function onChatMessageDeleted(messageId) {
		const msgEl = components.get('chat/message', messageId);
		const parentEl = $(`[component="chat/message/parent"][data-parent-mid="${messageId}"]`);
		const isSelf = parseInt(msgEl.attr('data-uid'), 10) === app.user.uid;
		const isParentSelf = parseInt(parentEl.attr('data-uid'), 10) === app.user.uid;
		msgEl.toggleClass('deleted', true);
		parentEl.toggleClass('deleted', true);
		if (!isSelf) {
			msgEl.find('[component="chat/message/body"]')
				.translateHtml('<p>[[modules:chat.message-deleted]]</p>');
		}
		if (!isParentSelf) {
			parentEl.find('[component="chat/message/parent/content"]')
				.translateHtml('<p>[[modules:chat.message-deleted]]</p>');
		}
	}

	function onChatMessageRestored(message) {
		const msgEl = components.get('chat/message', message.messageId);
		const parentEl = $(`[component="chat/message/parent"][data-parent-mid="${message.messageId}"]`);
		const isSelf = parseInt(msgEl.attr('data-uid'), 10) === app.user.uid;
		const isParentSelf = parseInt(parentEl.attr('data-uid'), 10) === app.user.uid;
		msgEl.toggleClass('deleted', false);
		parentEl.toggleClass('deleted', false);
		if (!isSelf) {
			msgEl.find('[component="chat/message/body"]')
				.translateHtml(message.content);
			messages.onMessagesAddedToDom(components.get('chat/message', message.messageId));
		}

		if (!isParentSelf && parentEl.length) {
			parentEl.find('[component="chat/message/parent/content"]')
				.translateHtml(message.content);
			messages.onMessagesAddedToDom($(`[component="chat/message/parent"][data-parent-mid="${message.messageId}"]`));
		}
	}

	messages.delete = function (messageId, roomId) {
		bootbox.confirm('[[modules:chat.delete-message-confirm]]', function (ok) {
			if (!ok) {
				return;
			}

			api.del(`/chats/${roomId}/messages/${encodeURIComponent(messageId)}`, {}).then(() => {
				components.get('chat/message', messageId).toggleClass('deleted', true);
			}).catch(alerts.error);
		});
	};

	messages.restore = function (messageId, roomId) {
		api.post(`/chats/${roomId}/messages/${encodeURIComponent(messageId)}`, {}).then(() => {
			components.get('chat/message', messageId).toggleClass('deleted', false);
		}).catch(alerts.error);
	};

	/**
	 * Initialize forward message dropdown
	 */
	messages.initForwardDropdown = function () {
		console.log('Initializing forward message dropdown handlers');
		$(document).off('click.forward').on('click.forward', '[component="chat/message/reply"]', function (e) {
			e.preventDefault();
			e.stopPropagation();
			const msgEl = $(this).closest('[component="chat/message"]');
			const mid = msgEl.attr('data-mid');
			const roomId = msgEl.closest('[component="chat/messages"]').attr('data-roomid');
			
			// Close any other open dropdowns
			$('.forward-dropdown').removeClass('show');
			
			// Toggle this dropdown
			const dropdown = msgEl.find('.forward-dropdown');
			if (dropdown.hasClass('show')) {
				dropdown.removeClass('show');
			} else {
				messages.showForwardDropdown(mid, roomId, msgEl);
			}
		});

		// Close dropdown when clicking outside
		$(document).off('click.forward-outside').on('click.forward-outside', function (e) {
			if (!$(e.target).closest('.forward-dropdown, [component="chat/message/reply"]').length) {
				$('.forward-dropdown').removeClass('show');
			}
		});

		// Close button handler
		$(document).off('click.forward-close').on('click.forward-close', '.close-forward-dropdown', function (e) {
			e.preventDefault();
			e.stopPropagation();
			$(this).closest('.forward-dropdown').removeClass('show');
		});

		// Show dropdown on message hover (with small delay to avoid flicker)
		$(document).off('mouseenter.forward mouseleave.forward', '[component="chat/message"]').on('mouseenter.forward', '[component="chat/message"]', function () {
			const msgEl = $(this);
			// Clear any pending hide timer
			clearTimeout(msgEl.data('forwardHideTimer'));
			// If already shown, nothing to do
			const dropdown = msgEl.find('.forward-dropdown');
			if (dropdown.hasClass('show')) {
				return;
			}
			// Set a short timer to open dropdown (prevents accidental triggers)
			const openTimer = setTimeout(() => {
				const mid = msgEl.attr('data-mid');
				const roomId = msgEl.closest('[component="chat/messages"]').attr('data-roomid');
				messages.showForwardDropdown(mid, roomId, msgEl);
			}, 250);
			msgEl.data('forwardOpenTimer', openTimer);
		}).on('mouseleave.forward', '[component="chat/message"]', function () {
			const msgEl = $(this);
			// Cancel open timer if still pending
			clearTimeout(msgEl.data('forwardOpenTimer'));
			// Start hide timer so user can move into dropdown
			const dropdown = msgEl.find('.forward-dropdown');
			const hideTimer = setTimeout(() => {
				dropdown.removeClass('show');
			}, 300);
			msgEl.data('forwardHideTimer', hideTimer);
		});

		// Keep dropdown open if hovered, hide when leaving dropdown
		$(document).off('mouseenter.forwardDropdown mouseleave.forwardDropdown', '.forward-dropdown').on('mouseenter.forwardDropdown', '.forward-dropdown', function () {
			const dropdown = $(this);
			clearTimeout(dropdown.data('forwardHideTimer'));
		}).on('mouseleave.forwardDropdown', '.forward-dropdown', function () {
			const dropdown = $(this);
			// hide shortly after leaving dropdown
			const hideTimer = setTimeout(() => dropdown.removeClass('show'), 200);
			dropdown.data('forwardHideTimer', hideTimer);
		});
	};

	/**
	 * Show forward dropdown and load available chats
	 */
	messages.showForwardDropdown = async function (mid, currentRoomId, msgEl) {
		const dropdown = msgEl.find('.forward-dropdown');
		dropdown.addClass('show');
		
		// Show loading state
		dropdown.find('.forward-loading').show();
		dropdown.find('.forward-recipients-container').empty();
		dropdown.find('.forward-no-results').hide();

		try {
			// Fetch available rooms (excluding current room)
			const rooms = await messages.fetchAvailableRooms(currentRoomId);
			
			dropdown.find('.forward-loading').hide();
			
			if (rooms.length === 0) {
				dropdown.find('.forward-no-results').show();
				return;
			}

			// Render rooms
			messages.renderForwardRecipients(dropdown, rooms, mid, currentRoomId);
			
		} catch (err) {
			dropdown.find('.forward-loading').hide();
			alerts.error('Failed to load chats');
			console.error(err);
		}
	};

	/**
	 * Fetch available rooms for forwarding
	 */
	messages.fetchAvailableRooms = async function (currentRoomId) {
		try {
			// Fetch rooms from API
			const data = await api.get('/chats', { start: 0 });
			
			if (!data || !data.rooms) {
				console.warn('No rooms returned from API');
				return [];
			}

			// Filter out current room and map to our format
			const recentRooms = data.rooms
				.filter(room => parseInt(room.roomId, 10) !== parseInt(currentRoomId, 10))
				.map(room => ({
					roomId: room.roomId,
					roomName: room.roomName || room.usernames,
					teaser: room.teaser ? room.teaser.content : '',
					avatar: room.teaser ? room.teaser.user.picture : null,
				}));

			// Also try to get public rooms if they exist
			let publicRooms = [];
			if (ajaxify.data.publicRooms && Array.isArray(ajaxify.data.publicRooms)) {
				publicRooms = ajaxify.data.publicRooms
					.filter(room => parseInt(room.roomId, 10) !== parseInt(currentRoomId, 10))
					.map(room => ({
						roomId: room.roomId,
						roomName: room.roomName,
						isPublic: true,
						icon: room.icon || 'fa fa-comments',
					}));
			}

			const allRooms = [...recentRooms, ...publicRooms];
			console.log('Fetched rooms for forwarding:', allRooms);
			return allRooms;

		} catch (err) {
			console.error('Error fetching rooms:', err);
		}
	};


	/**
	 * Render recipient list in dropdown
	 */
	messages.renderForwardRecipients = function (dropdown, rooms, mid, currentRoomId) {
		const container = dropdown.find('.forward-recipients-container');
		container.empty();

		rooms.forEach(function (room) {
			const recipientHtml = `
				<div class="forward-recipient-item" data-roomid="${room.roomId}" data-mid="${mid}">
					<div class="forward-recipient-avatar">
						${room.avatar ? 
								`<img src="${room.avatar}" alt="${room.roomName}">` : 
								`<i class="${room.icon || 'fa fa-user'}"></i>`
						}
					</div>
					<div class="forward-recipient-info">
						<span class="forward-recipient-name">${room.roomName}</span>
						${room.teaser ? `<span class="forward-recipient-status">${room.teaser}</span>` : ''}
						${room.isPublic ? '<span class="forward-recipient-status"><i class="fa fa-globe"></i> Public</span>' : ''}
					</div>
				</div>
			`;
			container.append(recipientHtml);
		});

		// Add click handlers for recipients
		container.find('.forward-recipient-item').off('click').on('click', function () {
			const recipientEl = $(this);
			const targetRoomId = recipientEl.attr('data-roomid');
			const messageId = recipientEl.attr('data-mid');
			
			messages.forwardMessage(messageId, currentRoomId, targetRoomId);
			dropdown.removeClass('show');
		});

		// Add search functionality
		messages.initForwardSearch(dropdown, rooms, mid, currentRoomId);
	};

	/**
	 * Initialize search functionality in forward dropdown
	 */
	messages.initForwardSearch = function (dropdown, rooms, mid, currentRoomId) {
		const searchInput = dropdown.find('.forward-search-input');
		
		searchInput.off('input').on('input', function () {
			const query = $(this).val().toLowerCase().trim();
			
			if (!query) {
				// Show all rooms
				messages.renderForwardRecipients(dropdown, rooms, mid, currentRoomId);
				return;
			}

			// Filter rooms
			const filteredRooms = rooms.filter(function (room) {
				return room.roomName.toLowerCase().includes(query);
			});

			if (filteredRooms.length === 0) {
				dropdown.find('.forward-recipients-container').empty();
				dropdown.find('.forward-no-results').show();
			} else {
				dropdown.find('.forward-no-results').hide();
				messages.renderForwardRecipients(dropdown, filteredRooms, mid, currentRoomId);
			}
		});
	};

	/**
	 * Forward message to another room
	 * Note: This is a placeholder - backend implementation will be needed
	 */
	messages.forwardMessage = async function (messageId, fromRoomId, toRoomId) {
		try {
			// Show loading indicator
			alerts.alert({
				alert_id: 'forwarding_message',
				title: '[[modules:chat.forwarding]]',
				message: '[[modules:chat.forwarding-message]]',
				type: 'info',
				timeout: 2000,
			});

			const message = '(Forwarded Message)'; // In future, implement adding message to forwarded message
			api.post(`/chats/${toRoomId}`, { message, forwardMid: messageId }).then(() => {
				hooks.fire('action:chat.sent', { toRoomId, message });
			}).catch((err) => {
				if (err.message === '[[error:email-not-confirmed-chat]]') {
					return messagesModule.showEmailConfirmWarning(err.message);
				}

				alerts.alert({
					alert_id: 'chat_spam_error',
					title: '[[global:alert.error]]',
					message: err.message,
					type: 'danger',
					timeout: 10000,
				});
			});
			// TODO: Replace with actual API call when backend is ready
			// For now, just show success message
			// const response = await api.post(`/chats/${toRoomId}`, {
			//     forwardMid: messageId
			// });

			// Simulated success (remove this when backend is ready)
			// setTimeout(function () {
			//  alerts.alert({
			//      alert_id: 'message_forwarded',
			//      title: '[[global:alert.success]]',
			//      message: '[[modules:chat.message-forwarded]]',
			//      type: 'success',
			//      timeout: 3000,
			//  });
			// }, 500);

			hooks.fire('action:chat.forwarded', {
				messageId: messageId,
				fromRoomId: fromRoomId,
				toRoomId: toRoomId,
			});

		} catch (err) {
			alerts.error(err);
			console.error('Forward error:', err);
		}
	};

	return messages;
});


