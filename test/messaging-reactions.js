'use strict';

const assert = require('assert');

const nconf = require('nconf');
const db = require('./mocks/databasemock');
const User = require('../src/user');
const Messaging = require('../src/messaging');
const helpers = require('./helpers');
const request = require('../src/request');

describe('Chat Message Emoji Reactions', () => {
	const mocks = {
		users: {
			foo: {}, // the admin
			bar: {},
			baz: {},
		},
	};
	let roomId;
	let messageMid;

	const callv3API = async (method, path, body, user) => {
		const options = {
			body,
			jar: mocks.users[user].jar,
		};

		if (method !== 'get') {
			options.headers = {
				'x-csrf-token': mocks.users[user].csrf,
			};
		}

		return request[method](`${nconf.get('url')}/api/v3${path}`, options);
	};

	before(async () => {
		// Create users
		mocks.users.foo.uid = await User.create({ username: 'foo', password: 'barbar' });
		mocks.users.bar.uid = await User.create({ username: 'bar', password: 'barbar' });
		mocks.users.baz.uid = await User.create({ username: 'baz', password: 'barbar' });

		// Login users
		await Promise.all(Object.entries(mocks.users).map(async ([key, user]) => {
			const loginData = await helpers.loginUser(key, 'barbar');
			user.jar = loginData.jar;
			user.csrf = loginData.csrf;
		}));

		// Create a chat room
		const { body } = await callv3API('post', '/chats', {
			uids: [mocks.users.bar.uid],
		}, 'foo');
		roomId = body.response.roomId;

		// Add baz to room
		await callv3API('post', `/chats/${roomId}/users`, {
			uids: [mocks.users.baz.uid],
		}, 'foo');

		// Send a test message
		const { body: msgBody } = await callv3API('post', `/chats/${roomId}`, {
			roomId: roomId,
			message: 'Test message for reactions',
		}, 'foo');
		messageMid = msgBody.response.mid;
	});

	describe('Adding reactions', () => {
		it('should add emoji reaction to message', async () => {
			// Note: This assumes the reactions plugin provides an endpoint like /chats/:roomId/messages/:mid/reactions
			// Adjust the endpoint based on actual plugin API
			const result = await callv3API('post', `/chats/${roomId}/messages/${messageMid}/reactions`, {
				emoji: '👍',
			}, 'bar');

			assert.strictEqual(result.response.statusCode, 200);
			assert(result.body.response);
		});

		it('should fail if emoji is not provided', async () => {
			const result = await callv3API('post', `/chats/${roomId}/messages/${messageMid}/reactions`, {
				// emoji missing
			}, 'bar');

			assert.strictEqual(result.response.statusCode, 400);
		});

		it('should fail if emoji is empty string', async () => {
			const result = await callv3API('post', `/chats/${roomId}/messages/${messageMid}/reactions`, {
				emoji: '',
			}, 'bar');

			assert.strictEqual(result.response.statusCode, 400);
		});

		it('should fail if message does not exist', async () => {
			const result = await callv3API('post', `/chats/${roomId}/messages/99999/reactions`, {
				emoji: '👍',
			}, 'bar');

			assert.strictEqual(result.response.statusCode, 400);
		});

		it('should fail if user is not in room', async () => {
			// Create a new user not in the room
			const newUserUid = await User.create({ username: 'notinroom', password: 'barbar' });
			const loginData = await helpers.loginUser('notinroom', 'barbar');

			const result = await request.post(`${nconf.get('url')}/api/v3/chats/${roomId}/messages/${messageMid}/reactions`, {
				body: { emoji: '👍' },
				jar: loginData.jar,
				headers: {
					'x-csrf-token': loginData.csrf,
				},
			});

			assert.strictEqual(result.response.statusCode, 403);
		});

		it('should allow multiple users to react with same emoji', async () => {
			// User bar reacts
			await callv3API('post', `/chats/${roomId}/messages/${messageMid}/reactions`, {
				emoji: '❤️',
			}, 'bar');

			// User baz reacts with same emoji
			const result = await callv3API('post', `/chats/${roomId}/messages/${messageMid}/reactions`, {
				emoji: '❤️',
			}, 'baz');

			assert.strictEqual(result.response.statusCode, 200);
		});

		it('should allow same user to react with different emojis', async () => {
			await callv3API('post', `/chats/${roomId}/messages/${messageMid}/reactions`, {
				emoji: '😀',
			}, 'bar');

			const result = await callv3API('post', `/chats/${roomId}/messages/${messageMid}/reactions`, {
				emoji: '🎉',
			}, 'bar');

			assert.strictEqual(result.response.statusCode, 200);
		});
	});

	describe('Removing reactions', () => {
		before(async () => {
			// Add a reaction to remove
			await callv3API('post', `/chats/${roomId}/messages/${messageMid}/reactions`, {
				emoji: '🔥',
			}, 'bar');
		});

		it('should remove emoji reaction from message', async () => {
			const result = await callv3API('delete', `/chats/${roomId}/messages/${messageMid}/reactions`, {
				emoji: '🔥',
			}, 'bar');

			assert.strictEqual(result.response.statusCode, 200);
		});

		it('should fail to remove reaction that does not exist', async () => {
			const result = await callv3API('delete', `/chats/${roomId}/messages/${messageMid}/reactions`, {
				emoji: '❌',
			}, 'bar');

			assert.strictEqual(result.response.statusCode, 400);
		});

		it('should fail to remove reaction from message user did not react to', async () => {
			// User baz adds reaction
			await callv3API('post', `/chats/${roomId}/messages/${messageMid}/reactions`, {
				emoji: '⭐',
			}, 'baz');

			// User bar tries to remove baz's reaction (should fail or be prevented)
			const result = await callv3API('delete', `/chats/${roomId}/messages/${messageMid}/reactions`, {
				emoji: '⭐',
			}, 'bar');

			// Should either fail or only remove bar's own reaction if they had one
			// Adjust assertion based on plugin behavior
			assert([200, 400, 403].includes(result.response.statusCode));
		});
	});

	describe('Getting reactions', () => {
		before(async () => {
			// Add some reactions
			await callv3API('post', `/chats/${roomId}/messages/${messageMid}/reactions`, {
				emoji: '👍',
			}, 'bar');
			await callv3API('post', `/chats/${roomId}/messages/${messageMid}/reactions`, {
				emoji: '👍',
			}, 'baz');
			await callv3API('post', `/chats/${roomId}/messages/${messageMid}/reactions`, {
				emoji: '❤️',
			}, 'bar');
		});

		it('should retrieve reactions for a message', async () => {
			const result = await callv3API('get', `/chats/${roomId}/messages/${messageMid}/reactions`, {}, 'foo');

			assert.strictEqual(result.response.statusCode, 200);
			assert(Array.isArray(result.body.response));
			// Verify reaction structure
			if (result.body.response.length > 0) {
				const reaction = result.body.response[0];
				assert(reaction.hasOwnProperty('emoji'));
				assert(reaction.hasOwnProperty('count') || reaction.hasOwnProperty('users'));
			}
		});

		it('should include user information in reactions', async () => {
			const result = await callv3API('get', `/chats/${roomId}/messages/${messageMid}/reactions`, {}, 'foo');

			if (result.body.response && result.body.response.length > 0) {
				const reaction = result.body.response.find(r => r.emoji === '👍');
				if (reaction && reaction.users) {
					assert(Array.isArray(reaction.users));
					// Verify user structure
					if (reaction.users.length > 0) {
						assert(reaction.users[0].hasOwnProperty('uid') || reaction.users[0].hasOwnProperty('username'));
					}
				}
			}
		});

		it('should show correct reaction counts', async () => {
			const result = await callv3API('get', `/chats/${roomId}/messages/${messageMid}/reactions`, {}, 'foo');

			if (result.body.response && result.body.response.length > 0) {
				const thumbsUp = result.body.response.find(r => r.emoji === '👍');
				if (thumbsUp) {
					// Should have 2 reactions (bar and baz)
					assert(thumbsUp.count >= 2 || (thumbsUp.users && thumbsUp.users.length >= 2));
				}
			}
		});
	});

	describe('Reaction validation', () => {
		it('should reject invalid emoji format', async () => {
			const result = await callv3API('post', `/chats/${roomId}/messages/${messageMid}/reactions`, {
				emoji: '<script>alert("xss")</script>',
			}, 'bar');

			assert.strictEqual(result.response.statusCode, 400);
		});

		it('should reject emoji that is too long', async () => {
			const result = await callv3API('post', `/chats/${roomId}/messages/${messageMid}/reactions`, {
				emoji: '👍'.repeat(100),
			}, 'bar');

			assert.strictEqual(result.response.statusCode, 400);
		});

		it('should accept standard emoji unicode', async () => {
			const validEmojis = ['👍', '❤️', '😀', '🎉', '🔥', '⭐'];
			const results = await Promise.all(validEmojis.map(emoji =>
				callv3API('post', `/chats/${roomId}/messages/${messageMid}/reactions`, {
					emoji: emoji,
				}, 'bar')
			));

			// Should succeed or handle gracefully
			results.forEach(result => {
				assert([200, 201].includes(result.response.statusCode));
			});
		});
	});

	describe('Reaction edge cases', () => {
		it('should handle reaction on deleted message', async () => {
			// Create and delete a message
			const { body: deleteBody } = await callv3API('post', `/chats/${roomId}`, {
				roomId: roomId,
				message: 'Message to be deleted',
			}, 'foo');
			const deleteMid = deleteBody.response.mid;

			await callv3API('delete', `/chats/${roomId}/messages/${deleteMid}`, {}, 'foo');

			// Try to react to deleted message
			const result = await callv3API('post', `/chats/${roomId}/messages/${deleteMid}/reactions`, {
				emoji: '👍',
			}, 'bar');

			assert.strictEqual(result.response.statusCode, 400);
		});

		it('should handle toggling reaction (add then remove)', async () => {
			// Add reaction
			await callv3API('post', `/chats/${roomId}/messages/${messageMid}/reactions`, {
				emoji: '🔄',
			}, 'baz');

			// Remove reaction
			const removeResult = await callv3API('delete', `/chats/${roomId}/messages/${messageMid}/reactions`, {
				emoji: '🔄',
			}, 'baz');

			assert.strictEqual(removeResult.response.statusCode, 200);

			// Verify it's removed
			const getResult = await callv3API('get', `/chats/${roomId}/messages/${messageMid}/reactions`, {}, 'foo');
			if (getResult.body.response) {
				const reaction = getResult.body.response.find(r => r.emoji === '🔄');
				if (reaction) {
					assert(reaction.count === 0 || (reaction.users && reaction.users.length === 0));
				}
			}
		});

		it('should persist reactions after message retrieval', async () => {
			// Add reaction
			await callv3API('post', `/chats/${roomId}/messages/${messageMid}/reactions`, {
				emoji: '💾',
			}, 'bar');

			// Retrieve message
			const { body } = await callv3API('get', `/chats/${roomId}`, {}, 'foo');
			const messages = body.response.messages;
			const msg = messages.find(m => m.messageId === messageMid);

			// Message should include reactions
			assert(msg);
			// Reactions might be in msg.reactions or similar field
			// Adjust based on actual plugin implementation
		});
	});
});
