'use strict';

const db = require('../database');

module.exports = function (Messaging) {
	const emojiRegex = /^\p{Emoji}$/u;

	Messaging.toggleReaction = async (uid, mid, roomId, emoji) => {
		if (!emoji || !emojiRegex.test(emoji)) {
			throw new Error('[[error:invalid-emoji]]');
		}
		
		const isMessageInRoom = await db.isSortedSetMember(`chat:room:${roomId}:mids`, mid);
		if (!isMessageInRoom) {
			throw new Error('[[error:invalid-mid]]');
		}

		const reactionUidsKey = `chat:room:${roomId}:message:${mid}:uids:${emoji}`;
		const hasReacted = await db.isSetMember(reactionUidsKey, uid);

		if (hasReacted) {
			await Messaging.removeReaction(uid, mid, roomId, emoji);
			return { added: false, emoji };
		} 
		else
		// eslint-disable-next-line no-else-return
		{
			await Messaging.addReaction(uid, mid, roomId, emoji);
			return { added: true, emoji };
		}
		
		
	};

	Messaging.addReaction = async (uid, mid, roomId, emoji) => {
		const reactionUidsKey = `chat:room:${roomId}:message:${mid}:uids:${emoji}`;
		const reactionCountKey = `chat:room:${roomId}:message:${mid}:reactions`;

		await db.setAdd(reactionUidsKey, uid);
		await db.incrObjectField(reactionCountKey, emoji);
	};

	Messaging.removeReaction = async (uid, mid, roomId, emoji) => {
		const reactionUidsKey = `chat:room:${roomId}:message:${mid}:uids:${emoji}`;
		const reactionCountKey = `chat:room:${roomId}:message:${mid}:reactions`;

		await db.setRemove(reactionUidsKey, uid);
		const newCount = await db.incrObjectFieldBy(reactionCountKey, emoji, -1);
		if (newCount <= 0) {
			await db.deleteObjectField(reactionCountKey, emoji);
		}
	};

	Messaging.getReactions = async (mid, roomId, uid) => {
		const reactionCountKey = `chat:room:${roomId}:message:${mid}:reactions`;
		const counts = await db.getObject(reactionCountKey);

		if (!counts) {
			return [];
		}

		const emojis = Object.keys(counts);
		const reactions = await Promise.all(emojis.map(async (emoji) => {
			const reactionUidsKey = `chat:room:${roomId}:message:${mid}:uids:${emoji}`;
			const self = await db.isSetMember(reactionUidsKey, uid);
			return {
				emoji,
				count: parseInt(counts[emoji], 10),
				self,
			};
		}));

		return reactions.filter(r => r.count > 0);
	};

	Messaging.deleteReactions = async (mid, roomId) => {
		const reactionCountKey = `chat:room:${roomId}:message:${mid}:reactions`;
		const counts = await db.getObject(reactionCountKey);
		if (!counts) {
			return;
		}
		const emojis = Object.keys(counts);
		const keysToDelete = [
			reactionCountKey,
			...emojis.map(emoji => `chat:room:${roomId}:message:${mid}:uids:${emoji}`),
		];
		await db.deleteAll(keysToDelete);
	};
};