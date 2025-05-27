import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    StyleSheet,
    Alert,
    Button,
    FlatList,
    Linking,
    Modal
} from 'react-native';
import EmojiSelector, { Categories } from 'react-native-emoji-selector';
import GroupDetailsModal from './GroupDetailsModal';
import { Video } from 'expo-av';

import ImageUploaderMobile from './ImageUploaderMobile';
import FileUploader from './FileUploaderMobile';
import { ActivityIndicator } from 'react-native';

const ChatContainer = ({
    currentRoom,
    messages,
    myname,
    sendMessage,
    message,
    setMessage,
    handleDeleteMessage,
    handleChooseEmotion,
    activeEmotionMsgId,
    setActiveEmotionMsgId,
    emotions,
    getMessageId,
    onGetGroupDetails,
    onBack,
    groupDetailsVisible,
    groupInfo,
    handleRemoveGroupMember,
    handleTransferGroupOwner,
    handleAssignDeputy,
    handleCancelDeputy,
    handleAddGroupMember,
    handleLeaveGroup,
    handleDisbandGroup,
    setGroupDetailsVisible,
    allUsers,
    friends,
    requestedFriends,
    friendRequests, // <-- thêm prop này
    handleAddFriend,
    onForwardMessage,
    socket
}) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showImageUploader, setShowImageUploader] = useState(false);
    const [showFileUploader, setShowFileUploader] = useState(false);
    const [showMediaUploader, setShowMediaUploader] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const scrollViewRef = useRef();
    const [deleteConfirmMsgId, setDeleteConfirmMsgId] = useState(null);
    const [deleteConfirmRoom, setDeleteConfirmRoom] = useState(null);
    // State để highlight tin nhắn khi scroll đến
    const [highlightedMsgId, setHighlightedMsgId] = useState(null);
    const [dummyState, setDummyState] = useState(0);
    const [showDetailPanel, setShowDetailPanel] = useState(false);
    const [showAllImagesVideos, setShowAllImagesVideos] = useState(false);
    const [showAllFiles, setShowAllFiles] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const prevScrollHeightRef = useRef(0);
    const prevMessagesLength = useRef(messages.length);

    {/* Debug: log trạng thái lời mời kết bạn */ }

    useEffect(() => {
        console.log('friendRequests:', friendRequests);
        console.log('requestedFriends:', requestedFriends);
    }, [friendRequests, requestedFriends])


    {/* Force re-render UI trạng thái friend khi các props liên quan friend thay đổi */ }

    useEffect(() => {
        // Dummy state để trigger re-render
        setDummyState(Date.now());
    }, [friends, requestedFriends, friendRequests, currentRoom, myname])

    useEffect(() => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
        }
    }, [messages]);

    const onEmojiClick = (emoji) => {
        setMessage(prev => prev + emoji);
    };

    const handleSend = () => {
        if (typeof message === 'string' && message.trim() !== '') {
            const msgObj = {
                id: Date.now(),
                name: myname,
                message: message,
                room: currentRoom,
                createdAt: new Date().toISOString(),
            };

            if (replyingTo) {
                msgObj.replyTo = replyingTo;
            }

            if (msgObj.room === currentRoom) {
                sendMessage(msgObj);
            }
            setMessage('');
            setReplyingTo(null);
        }
        setShowEmojiPicker(false);
    };

    const handleReply = (msg) => {
        setReplyingTo({
            id: msg._id || msg.id,
            name: msg.name,
            message: msg.message || '', // Đảm bảo không bị undefined
            fileUrl: msg.fileUrl || null,
            fileName: msg.fileName || null,
            fileType: msg.fileType || null
        });
    };

    const handleCancelReply = () => {
        setReplyingTo(null);
    };

    const handleImageUploadSuccess = (imageUrl) => {
        const fileMessage = {
            id: Date.now(),
            name: myname,
            message: "", // Có thể thêm text nếu cần
            room: currentRoom,
            fileUrl: imageUrl,
            fileType: 'image',
            createdAt: new Date().toISOString()
        };

        // Thêm replyTo nếu đang reply
        if (replyingTo) {
            fileMessage.replyTo = replyingTo;
        }

        if (fileMessage.room === currentRoom) {
            sendMessage(fileMessage);
        }
        setShowImageUploader(false);
        setReplyingTo(null); // Reset reply sau khi gửi
    };

    const handleFileUploadSuccess = (fileData) => {
        const fileMessage = {
            id: Date.now(),
            name: myname,
            message: "",
            room: currentRoom,
            fileUrl: fileData.url,
            fileType: fileData.type,
            fileName: fileData.name,
            fileSize: fileData.size,
            createdAt: new Date().toISOString()
        };

        if (replyingTo) {
            fileMessage.replyTo = {
                id: replyingTo.id,
                name: replyingTo.name,
                message: replyingTo.message,
                fileUrl: replyingTo.fileUrl,
                fileName: replyingTo.fileName,
                fileType: replyingTo.fileType
            };
        }

        if (fileMessage.room === currentRoom) {
            sendMessage(fileMessage);
        }
        setShowFileUploader(false);
        setReplyingTo(null);
    };

    const handleMediaUploadSuccess = (fileData) => {
        sendMessage({
            id: Date.now(),
            name: myname,
            message: '',
            room: currentRoom,
            fileUrl: fileData.url,
            fileType: fileData.type,
            fileName: fileData.name,
            fileSize: fileData.size,
        });
        setShowMediaUploader(false);
    };

    const getDisplayName = (roomName) => {
        if (!roomName) return '';
        if (roomName.includes('-')) {
            const names = roomName.split('-');
            return names.find(n => n !== myname) || names[0];
        } else {
            return roomName.split('_')[0];
        }
    };

    const isGroupChat = (roomName) => {
        return !roomName.includes('-');
    };

    const onChooseEmotion = (msgId, emotionId) => {
        handleChooseEmotion(msgId, emotionId);
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 24 * 60 * 60 * 1000) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    };

    const isPrivateChat = (roomName) => roomName && roomName.includes('-');

    // Tính toán partnerName, isStranger, isRequested cho UI trạng thái kết bạn
    let partnerName = null;
    if (currentRoom && !currentRoom.includes('group')) {
        const parts = currentRoom.split('-');
        partnerName = parts.find(name => name !== myname);
    }
    // Xác định trạng thái lời mời kết bạn
    let friendRequestStatus = null;
    let friendRequestObj = null;
    // Nếu chưa là bạn bè
    if (partnerName && !friends.includes(partnerName)) {
        if (requestedFriends && requestedFriends.includes(partnerName)) {
            friendRequestStatus = 'sent';
        } else if (friendRequests && friendRequests.some(r => r.from === partnerName && r.to === myname)) {
            friendRequestStatus = 'received';
            friendRequestObj = friendRequests.find(r => r.from === partnerName && r.to === myname);
        }
    }
    const isStranger = partnerName && !friends.includes(partnerName);
    const isRequested = partnerName && requestedFriends.includes(partnerName);

    // Scroll đến tin nhắn theo id và highlight
    const scrollToMessage = (msgId) => {
        const idx = messages.findIndex(m => (m._id || m.id) === msgId);
        if (idx !== -1 && scrollViewRef.current) {
            scrollViewRef.current.scrollToIndex({ index: idx, animated: true });
            setHighlightedMsgId(msgId);
            setTimeout(() => setHighlightedMsgId(null), 2000);
        }
    };

    const renderMessageItem = (msg) => {
        // Ẩn message kiểu call trên app mobile
        if (msg.type === 'call') return null;

        const isMine = msg.name === myname;
        const isHighlighted = highlightedMsgId === (msg._id || msg.id);

        return (
            <View
                key={getMessageId(msg)}
                style={[
                    styles.messageItem,
                    { alignSelf: isMine ? 'flex-end' : 'flex-start' },
                    isHighlighted && { backgroundColor: '#fff9c4', borderRadius: 8, transitionDuration: '0.3s' }
                ]}
            >
                {isMine && (
                    <View style={styles.actionContainer}>
                        <TouchableOpacity onPress={() => handleReply(msg)}>
                            <Text style={styles.actionIcon}>↩️</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() =>
                                setActiveEmotionMsgId(
                                    getMessageId(msg) === activeEmotionMsgId
                                        ? null
                                        : getMessageId(msg)
                                )
                            }
                        >
                            <Text style={styles.emotionIcon}>😊</Text>
                        </TouchableOpacity>

                        {activeEmotionMsgId === getMessageId(msg) && (
                            <View style={styles.emojiPicker}>
                                {emotions.map((em) => (
                                    <TouchableOpacity
                                        key={em.id}
                                        onPress={() => {
                                            onChooseEmotion(getMessageId(msg), em.id);
                                            setActiveEmotionMsgId(null);
                                        }}
                                        style={styles.emojiButton}
                                    >
                                        <Text style={styles.emojiText}>{em.icon}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <TouchableOpacity
                            onPress={() => {
                                setDeleteConfirmMsgId(getMessageId(msg));
                                setDeleteConfirmRoom(msg.room);
                            }}
                        >
                            <Text style={styles.deleteButton}>X</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => onForwardMessage && onForwardMessage(msg)}
                        >
                            <Text style={styles.actionIcon}>📤</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View
                    style={[
                        styles.bubble,
                        { backgroundColor: isMine ? '#dcf8c6' : '#fff' }
                    ]}
                >
                    {!isMine && <Text style={styles.senderName}>{msg.name}</Text>}

                    {msg.replyTo &&
                        msg.replyTo.id &&
                        msg.replyTo.name &&
                        (msg.replyTo.message || msg.replyTo.fileUrl) && (
                            (() => {
                                const originalIdx = messages.findIndex(
                                    (m) => m._id === msg.replyTo.id || m.id === msg.replyTo.id
                                );
                                const originalExists = originalIdx !== -1;
                                const replyPreviewContent = (
                                    <View style={styles.replyPreview}>
                                        <Text style={styles.replyToText}>
                                            Replying to {msg.replyTo.name}
                                        </Text>
                                        {msg.replyTo.message ? (
                                            <Text style={[styles.replyMessageText, !originalExists && styles.deletedReply]}>
                                                {originalExists ? msg.replyTo.message : 'Tin nhắn đã bị xóa'}
                                            </Text>
                                        ) : msg.replyTo.fileUrl ? (
                                            !originalExists ? (
                                                <Text style={[styles.replyFileText, styles.deletedReply]}>Tin nhắn đã bị xóa</Text>
                                            ) : (
                                                <View style={styles.replyFilePreview}>
                                                    {/\.(jpe?g|png|gif|webp)$/i.test(
                                                        msg.replyTo.fileUrl
                                                    ) ? (
                                                        <Image
                                                            source={{
                                                                uri: msg.replyTo
                                                                    .fileUrl
                                                            }}
                                                            style={
                                                                styles.replyFileImage
                                                            }
                                                        />
                                                    ) : /\.(mp4|webm|ogg)$/i.test(
                                                        msg.replyTo.fileUrl
                                                    ) ? (
                                                        <View
                                                            style={
                                                                styles.replyVideoContainer
                                                            }
                                                        >
                                                            <Text
                                                                style={
                                                                    styles.replyFileText
                                                                }
                                                            >
                                                                [Video]
                                                            </Text>
                                                        </View>
                                                    ) : (
                                                        <Text
                                                            style={
                                                                styles.replyFileText
                                                            }
                                                        >
                                                            [File]{' '}
                                                            {msg.replyTo
                                                                .fileName ||
                                                                'Tệp đính kèm'}
                                                        </Text>
                                                    )}
                                                </View>
                                            )
                                        ) : null}
                                    </View>
                                );
                                return originalExists ? (
                                    <TouchableOpacity onPress={() => scrollToMessage(msg.replyTo.id)}>
                                        {replyPreviewContent}
                                    </TouchableOpacity>
                                ) : (
                                    replyPreviewContent
                                );
                            })()
                        )}

                    {msg.forwardedFrom && (
                        <View
                            style={[
                                styles.replyPreview,
                                {
                                    backgroundColor: '#e6f7ff',
                                    borderLeftColor: '#00bfff'
                                }
                            ]}
                        >
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: '#007bff',
                                    fontWeight: 'bold'
                                }}
                            >
                                Chuyển tiếp từ {msg.forwardedFrom.name}
                            </Text>
                            {msg.forwardedFrom.message ? (
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: '#333',
                                        fontStyle: 'italic'
                                    }}
                                >
                                    {msg.forwardedFrom.message}
                                </Text>
                            ) : msg.forwardedFrom.fileUrl ? (
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: '#333',
                                        fontStyle: 'italic'
                                    }}
                                >
                                    [Tệp]{' '}
                                    {msg.forwardedFrom.fileName || 'Tệp đính kèm'}
                                </Text>
                            ) : null}
                        </View>
                    )}

                    {msg.message && (
                        <Text style={styles.messageText}>{msg.message}</Text>
                    )}

                    {msg.fileUrl && (
                        <View style={{ marginTop: 5 }}>
                            {/\.(jpe?g|png|gif|webp)$/i.test(msg.fileUrl) ? (
                                <Image
                                    source={{ uri: msg.fileUrl }}
                                    style={{
                                        width: 200,
                                        height: 200,
                                        borderRadius: 8
                                    }}
                                    resizeMode="cover"
                                />
                            ) : /\.(mp4|webm|ogg)$/i.test(msg.fileUrl) ? (
                                <Video
                                    source={{ uri: msg.fileUrl }}
                                    style={{
                                        width: 200,
                                        height: 200,
                                        borderRadius: 8
                                    }}
                                    useNativeControls
                                    resizeMode="contain"
                                    shouldPlay={false}
                                    isLooping={false}
                                />
                            ) : (
                                <TouchableOpacity
                                    onPress={() => Linking.openURL(msg.fileUrl)}
                                    style={styles.fileContainer}
                                >
                                    <Text style={styles.fileIcon}>📄</Text>
                                    <View style={styles.fileInfo}>
                                        <Text style={styles.fileName}>
                                            {msg.fileName || 'Tệp đính kèm'}
                                        </Text>
                                        <Text style={styles.fileSize}>
                                            {msg.fileSize
                                                ? `(${(
                                                    msg.fileSize / 1024
                                                ).toFixed(2)} KB)`
                                                : ''}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {msg.reaction && (
                        <Text style={styles.reaction}>
                            {emotions[msg.reaction - 1].icon}
                        </Text>
                    )}

                    <Text style={styles.timeText}>
                        {formatTime(msg.createdAt)}
                    </Text>
                </View>

                {!isMine && (
                    <View style={styles.actionContainer}>
                        <TouchableOpacity onPress={() => handleReply(msg)}>
                            <Text style={styles.actionIcon}>↩️</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() =>
                                setActiveEmotionMsgId(
                                    getMessageId(msg) === activeEmotionMsgId
                                        ? null
                                        : getMessageId(msg)
                                )
                            }
                        >
                            <Text style={styles.emotionIcon}>😊</Text>
                        </TouchableOpacity>

                        {activeEmotionMsgId === getMessageId(msg) && (
                            <View style={styles.emojiPickerRight}>
                                {emotions.map((em) => (
                                    <TouchableOpacity
                                        key={em.id}
                                        onPress={() => {
                                            onChooseEmotion(getMessageId(msg), em.id);
                                            setActiveEmotionMsgId(null);
                                        }}
                                        style={styles.emojiButton}
                                    >
                                        <Text style={styles.emojiText}>{em.icon}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <TouchableOpacity
                            onPress={() => onForwardMessage && onForwardMessage(msg)}
                        >
                            <Text style={styles.actionIcon}>📤</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    // Lấy toàn bộ file/ảnh/video của đoạn chat từ server khi mở panel chi tiết (giống web)
    const [allFilesInRoom, setAllFilesInRoom] = useState([]);
    useEffect(() => {
        if (showDetailPanel && currentRoom && socket) {
            socket.emit('getAllFilesInRoom', currentRoom);
        }
    }, [showDetailPanel, currentRoom, socket]);
    useEffect(() => {
        if (!socket) return;
        const handler = (files) => setAllFilesInRoom(files || []);
        socket.on('allFilesInRoom', handler);
        return () => socket.off('allFilesInRoom', handler);
    }, [socket]);
    const allSentImagesVideos = allFilesInRoom.filter(msg =>
        msg.fileType === 'image' ||
        /\.(jpe?g|png|gif|webp)$/i.test(msg.fileUrl) ||
        msg.fileType === 'video' ||
        /\.(mp4|webm|ogg)$/i.test(msg.fileUrl)
    );
    const allSentOtherFiles = allFilesInRoom.filter(msg =>
        !(
            msg.fileType === 'image' ||
            /\.(jpe?g|png|gif|webp)$/i.test(msg.fileUrl) ||
            msg.fileType === 'video' ||
            /\.(mp4|webm|ogg)$/i.test(msg.fileUrl)
        )
    );

    // Hàm load thêm tin nhắn khi scroll lên đầu
    const handleLoadMore = () => {
        if (!loadingMore && hasMore && messages.length > 0) {
            const oldest = messages[0];
            socket.emit('loadMoreMessages', {
                room: currentRoom,
                before: oldest.createdAt // ISO string
            });
            setLoadingMore(true);
        }
    };

    // Lắng nghe sự kiện moreMessages từ server
    useEffect(() => {
        if (!socket) return;
        const onMoreMessages = ({ room, messages: more }) => {
            if (room === currentRoom) {
                if (more.length === 0) setHasMore(false);
                setMessages(prev => {
                    // Gộp, loại trùng
                    const all = [...more, ...prev];
                    const unique = [];
                    const seen = new Set();
                    for (const m of all) {
                        const id = m._id?.toString() || m.id?.toString();
                        if (!seen.has(id)) {
                            unique.push(m);
                            seen.add(id);
                        }
                    }
                    unique.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                    return unique;
                });
                setLoadingMore(false);
            }
        };
        socket.on('moreMessages', onMoreMessages);
        return () => socket.off('moreMessages', onMoreMessages);
    }, [currentRoom, socket, hasMore]);

    // ScrollView: khi scroll lên đầu thì load more
    const onScroll = (event) => {
        const { contentOffset } = event.nativeEvent;
        if (contentOffset.y <= 10 && !loadingMore && hasMore && messages.length > 0) {
            handleLoadMore();
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>👈</Text>
                </TouchableOpacity>
                <Text style={styles.roomHeader}>{getDisplayName(currentRoom)}</Text>
                <TouchableOpacity style={[styles.groupDetailsButton, { backgroundColor: '#007bff', marginRight: 8 }]} onPress={() => setShowDetailPanel(true)}>
                    <Text style={styles.groupDetailsButtonText}>Chi tiết đoạn chat</Text>
                </TouchableOpacity>
                {isGroupChat(currentRoom) && (
                    <TouchableOpacity style={styles.groupDetailsButton} onPress={onGetGroupDetails}>
                        <Text style={styles.groupDetailsButtonText}>Group Details</Text>
                    </TouchableOpacity>
                )}
                {isPrivateChat(currentRoom) && isStranger && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, justifyContent: 'center' }}>
                        <Text style={{ color: 'red', fontWeight: 'bold', marginRight: 8 }}>Người lạ</Text>
                        {friendRequestStatus === 'sent' ? (
                            <TouchableOpacity style={{ backgroundColor: '#ccc', padding: 8, borderRadius: 6 }} disabled>
                                <Text style={{ color: '#888' }}>Đã gửi</Text>
                            </TouchableOpacity>
                        ) : friendRequestStatus === 'received' ? (
                            <>
                                <TouchableOpacity
                                    style={{ backgroundColor: '#28a745', padding: 8, borderRadius: 6, marginRight: 8 }}
                                    onPress={() => {
                                        if (friendRequestObj && (friendRequestObj._id || friendRequestObj.id || (friendRequestObj.from && friendRequestObj.to))) {
                                            const payload = friendRequestObj._id || friendRequestObj.id
                                                ? { requestId: friendRequestObj._id || friendRequestObj.id, action: 'accepted' }
                                                : { from: friendRequestObj.from, to: friendRequestObj.to, action: 'accepted' };
                                            socket.emit('respondFriendRequest', payload);
                                            // Đồng bộ lại friends và requests
                                            socket.emit('getFriends', myname);
                                            socket.emit('getFriendRequests', myname);
                                        } else {
                                            console.log('Không đủ thông tin friendRequestObj:', friendRequestObj);
                                        }
                                    }}
                                    disabled={!(friendRequestObj && (friendRequestObj._id || friendRequestObj.id || (friendRequestObj.from && friendRequestObj.to)))}
                                >
                                    <Text style={{ color: '#fff' }}>Chấp nhận</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ backgroundColor: '#dc3545', padding: 8, borderRadius: 6 }}
                                    onPress={() => {
                                        if (friendRequestObj && (friendRequestObj._id || friendRequestObj.id || (friendRequestObj.from && friendRequestObj.to))) {
                                            const payload = friendRequestObj._id || friendRequestObj.id
                                                ? { requestId: friendRequestObj._id || friendRequestObj.id, action: 'rejected' }
                                                : { from: friendRequestObj.from, to: friendRequestObj.to, action: 'rejected' };
                                            socket.emit('respondFriendRequest', payload);
                                            // Đồng bộ lại friends và requests
                                            socket.emit('getFriends', myname);
                                            socket.emit('getFriendRequests', myname);
                                        } else {
                                            console.log('Không đủ thông tin friendRequestObj:', friendRequestObj);
                                        }
                                    }}
                                    disabled={!(friendRequestObj && (friendRequestObj._id || friendRequestObj.id || (friendRequestObj.from && friendRequestObj.to)))}
                                >
                                    <Text style={{ color: '#fff' }}>Từ chối</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity style={{ backgroundColor: '#007bff', padding: 8, borderRadius: 6 }} onPress={() => {
                                handleAddFriend && handleAddFriend(partnerName);
                                if (typeof setRequestedFriends === 'function') setRequestedFriends(prev => prev.includes(partnerName) ? prev : [...prev, partnerName]);
                            }}>
                                <Text style={{ color: '#fff' }}>Gửi lời mời kết bạn</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            <FlatList
                style={styles.messageContainer}
                ref={scrollViewRef}
                data={messages}
                keyExtractor={(msg) => getMessageId(msg)}
                renderItem={({ item: msg }) => renderMessageItem(msg)}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No messages yet.</Text>
                    </View>
                }
            />

            <View style={styles.inputContainer}>
                {replyingTo && replyingTo.id && replyingTo.name && (replyingTo.message || replyingTo.fileUrl) && (
                    <View style={styles.replyIndicator}>
                        <Text style={styles.replyIndicatorText}>
                            Replying to {replyingTo.name}:
                            {replyingTo.message
                                ? ` ${replyingTo.message.substring(0, 20)}${replyingTo.message.length > 20 ? '...' : ''}`
                                : replyingTo.fileUrl
                                    ? ` [${replyingTo.fileType?.startsWith('image') ? 'Hình ảnh' :
                                        replyingTo.fileType?.startsWith('video') ? 'Video' : 'File'}]`
                                    : ''}
                        </Text>
                        <TouchableOpacity onPress={handleCancelReply}>
                            <Text style={styles.cancelReplyText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <TextInput
                    style={styles.input}
                    placeholder="Enter your message"
                    value={message}
                    onChangeText={setMessage}
                    onSubmitEditing={handleSend}
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                    <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowEmojiPicker(prev => !prev)}>
                    <Text style={styles.secondaryButtonText}>Emoji</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowImageUploader(prev => !prev)}>
                    <Text style={styles.secondaryButtonText}>Image</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowFileUploader(prev => !prev)}>
                    <Text style={styles.secondaryButtonText}>File</Text>
                </TouchableOpacity>
            </View>

            {showEmojiPicker && (
                <View style={styles.emojiSelectorContainer}>
                    <EmojiSelector
                        onEmojiSelected={(emoji) => {
                            setMessage(prev => prev + emoji);
                            setShowEmojiPicker(false);
                        }}
                        showSearchBar={true}
                        category={Categories.all}
                    />
                </View>
            )}

            {showImageUploader && (
                <View style={styles.uploaderOverlay}>
                    <ImageUploaderMobile onUploadSuccess={handleImageUploadSuccess} />
                    <Button title="Đóng" onPress={() => setShowImageUploader(false)} />
                </View>
            )}

            {showFileUploader && (
                <View style={styles.uploaderOverlay}>
                    <FileUploader
                        onUploadSuccess={(fileData) => {
                            handleFileUploadSuccess(fileData);
                            setShowFileUploader(false);
                        }}
                        fileTypes={[
                            'video/*',
                            'application/pdf',
                            'application/msword',
                            'application/vnd.ms-excel',
                            'application/vnd.ms-powerpoint'
                        ]}
                    />
                    <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={() => setShowFileUploader(false)}
                    >
                        <Text style={{ color: 'red', fontWeight: 'bold' }}>ĐÓNG</Text>
                    </TouchableOpacity>
                </View>
            )}

            {groupDetailsVisible && groupInfo && (
                <GroupDetailsModal
                    groupInfo={groupInfo}
                    setGroupDetailsVisible={setGroupDetailsVisible}
                    myname={myname}
                    handleRemoveGroupMember={handleRemoveGroupMember}
                    handleTransferGroupOwner={handleTransferGroupOwner}
                    handleAssignDeputy={handleAssignDeputy}
                    handleCancelDeputy={handleCancelDeputy}
                    handleAddGroupMember={handleAddGroupMember}
                    handleLeaveGroup={handleLeaveGroup}
                    handleDisbandGroup={handleDisbandGroup}
                    allUsers={allUsers}
                />
            )}

            {deleteConfirmMsgId && (
                <Modal
                    transparent
                    animationType="fade"
                    visible={!!deleteConfirmMsgId}
                    onRequestClose={() => setDeleteConfirmMsgId(null)}
                >
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
                        <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 10, alignItems: 'center', width: 280 }}>
                            <Text style={{ fontSize: 16, marginBottom: 16 }}>Bạn có chắc chắn muốn xóa tin nhắn này?</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                                <TouchableOpacity style={{ flex: 1, alignItems: 'center', padding: 10 }} onPress={() => setDeleteConfirmMsgId(null)}>
                                    <Text style={{ color: '#007bff', fontWeight: 'bold' }}>Hủy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={{ flex: 1, alignItems: 'center', padding: 10 }} onPress={() => {
                                    handleDeleteMessage(deleteConfirmMsgId, deleteConfirmRoom);
                                    setDeleteConfirmMsgId(null);
                                    setDeleteConfirmRoom(null);
                                }}>
                                    <Text style={{ color: 'red', fontWeight: 'bold' }}>Xóa</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}

            {showDetailPanel && (
                <View style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 320,
                    height: '100%',
                    backgroundColor: '#fff',
                    borderLeftWidth: 1,
                    borderColor: '#eee',
                    zIndex: 9999,
                    shadowColor: '#000',
                    shadowOpacity: 0.2,
                    shadowOffset: { width: -2, height: 0 },
                    shadowRadius: 8,
                    elevation: 10,
                }}>
                    <TouchableOpacity
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: -1000,
                            width: 1000,
                            height: '100%',
                            backgroundColor: 'rgba(0,0,0,0.2)',
                            zIndex: 9998,
                        }}
                        onPress={() => setShowDetailPanel(false)}
                    />
                    <View style={{ padding: 24, borderBottomWidth: 1, borderColor: '#eee', backgroundColor: '#f7f7f7', alignItems: 'center', position: 'relative' }}>
                        {/* Avatar + tên */}
                        {isGroupChat(currentRoom) ? (
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ fontSize: 32, color: '#007bff', marginBottom: 8 }}>👥</Text>
                                <Text style={{ fontWeight: 'bold', fontSize: 20 }}>{getDisplayName(currentRoom)}</Text>
                            </View>
                        ) : (
                            <View style={{ alignItems: 'center' }}>
                                {/* <Image
                                    source={{ uri: getAvatarByName(partnerName) }}
                                    style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 8 }}
                                /> */}
                                <Text style={{ fontWeight: 'bold', fontSize: 20 }}>{partnerName}</Text>
                            </View>
                        )}
                        <TouchableOpacity onPress={() => setShowDetailPanel(false)} style={{ position: 'absolute', top: 16, right: 16 }}>
                            <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 16 }}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={{ flex: 1, padding: 24 }}>
                        {/* Ảnh/Video đã gửi */}
                        <View style={{ marginBottom: 32 }}>
                            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 12, borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 4 }}>Ảnh/Video</Text>
                            {allSentImagesVideos.length === 0 && <Text style={{ color: '#888', fontSize: 13 }}>Chưa có ảnh hoặc video nào</Text>}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                {(showAllImagesVideos ? allSentImagesVideos : allSentImagesVideos.slice(0, 6)).map((msg, idx) => (
                                    <View key={msg._id || msg.id || idx} style={{ width: 90, height: 90, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', margin: 4 }}>
                                        {/\.(jpe?g|png|gif|webp)$/i.test(msg.fileUrl) ? (
                                            <Image source={{ uri: msg.fileUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                        ) : (
                                            <Video source={{ uri: msg.fileUrl }} style={{ width: '100%', height: '100%' }} useNativeControls resizeMode="cover" />
                                        )}
                                    </View>
                                ))}
                            </View>
                            {allSentImagesVideos.length > 6 && !showAllImagesVideos && (
                                <TouchableOpacity onPress={() => setShowAllImagesVideos(true)} style={{ marginTop: 8 }}>
                                    <Text style={{ color: '#007bff' }}>Xem tất cả</Text>
                                </TouchableOpacity>
                            )}
                            {showAllImagesVideos && allSentImagesVideos.length > 6 && (
                                <TouchableOpacity onPress={() => setShowAllImagesVideos(false)} style={{ marginTop: 8 }}>
                                    <Text style={{ color: '#007bff' }}>Ẩn bớt</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        {/* File */}
                        <View>
                            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 12, borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 4 }}>File</Text>
                            {allSentOtherFiles.length === 0 && <Text style={{ color: '#888', fontSize: 13 }}>Chưa có file nào</Text>}
                            {(showAllFiles ? allSentOtherFiles : allSentOtherFiles.slice(0, 6)).map((msg, idx) => (
                                <View key={msg._id || msg.id || idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <Text style={{ fontSize: 22, color: '#007bff', marginRight: 8 }}>📄</Text>
                                    <TouchableOpacity onPress={() => Linking.openURL(msg.fileUrl)}>
                                        <Text style={{ color: '#007bff', fontWeight: '500', fontSize: 15 }}>{msg.fileName || 'File'}</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {allSentOtherFiles.length > 6 && !showAllFiles && (
                                <TouchableOpacity onPress={() => setShowAllFiles(true)} style={{ marginTop: 8 }}>
                                    <Text style={{ color: '#007bff' }}>Xem tất cả</Text>
                                </TouchableOpacity>
                            )}
                            {showAllFiles && allSentOtherFiles.length > 6 && (
                                <TouchableOpacity onPress={() => setShowAllFiles(false)} style={{ marginTop: 8 }}>
                                    <Text style={{ color: '#007bff' }}>Ẩn bớt</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </ScrollView>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 10, backgroundColor: "#fff" },
    headerContainer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    backButton: { padding: 5, backgroundColor: "#007bff", borderRadius: 4 },
    backButtonText: { color: "#fff" },
    roomHeader: { fontSize: 20, flex: 1, marginLeft: 10 },
    groupDetailsButton: { backgroundColor: "#6c757d", padding: 8, borderRadius: 4 },
    groupDetailsButtonText: { color: "#fff" },
    messageContainer: { flex: 1, marginVertical: 10 },
    inputContainer: { flexDirection: "row", alignItems: "center", flexWrap: 'wrap' },
    input: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 4, padding: 8, minWidth: '60%' },
    sendButton: { backgroundColor: "#007bff", padding: 10, marginLeft: 5, borderRadius: 4 },
    sendButtonText: { color: "#fff" },
    secondaryButton: { backgroundColor: "#6c757d", padding: 10, marginLeft: 5, borderRadius: 4 },
    secondaryButtonText: { color: "#fff" },
    emojiSelectorContainer: {
        position: 'absolute',
        bottom: 60,
        right: 10,
        width: 250,
        height: 300,
        backgroundColor: '#fff',
        borderRadius: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        overflow: 'hidden'
    },
    messageItem: { marginBottom: 10, maxWidth: "80%" },
    actionContainer: { flexDirection: "row", alignItems: "center" },
    actionIcon: { fontSize: 16, marginRight: 5 },
    emotionIcon: { fontSize: 20, marginRight: 5 },
    emojiPicker: {
        flexDirection: "row",
        position: "absolute",
        top: -40,
        right: 40,
        backgroundColor: "aquamarine",
        borderRadius: 20,
        padding: 5
    },
    emojiPickerRight: {
        flexDirection: "row",
        position: "absolute",
        top: -40,
        left: 40,
        backgroundColor: "aquamarine",
        borderRadius: 20,
        padding: 5
    },
    emojiButton: { marginHorizontal: 2 },
    emojiText: { fontSize: 18 },
    deleteButton: { color: "red", marginLeft: 5 },
    bubble: {
        padding: 10,
        borderRadius: 10,
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2,
    },
    senderName: { fontWeight: "bold", marginBottom: 2 },
    messageText: { margin: 0 },
    reaction: {
        position: "absolute",
        bottom: -10,
        right: 4,
        backgroundColor: "blue",
        borderRadius: 10,
        padding: 3,
        color: "#fff"
    },
    uploaderOverlay: {
        position: 'absolute',
        bottom: 60,
        left: 20,
        right: 20,
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 10,
        elevation: 5,
        zIndex: 1000,
    },
    closeBtn: {
        marginTop: 8,
        alignSelf: 'flex-end',
    },
    timeText: {
        fontSize: 10,
        color: '#888',
        marginTop: 4,
        alignSelf: 'flex-end'
    },
    // Style cho reply
    replyPreview: {
        backgroundColor: '#f0f0f0',
        padding: 8,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#007bff',
        marginBottom: 5,
    },
    replyToText: {
        fontSize: 12,
        color: '#666',
    },
    replyMessageText: {
        fontSize: 12,
        color: '#333',
    },
    deletedReply: {
        fontStyle: 'italic',
        color: '#888',
    },
    replyIndicator: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        padding: 8,
        borderRadius: 8,
        marginBottom: 5,
        width: '100%',
    },
    replyIndicatorText: {
        fontSize: 12,
        flex: 1,
    },
    cancelReplyText: {
        color: 'red',
        marginLeft: 10,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyText: {
        fontSize: 16,
        color: '#888'
    },
    replyFilePreview: {
        marginTop: 4,
    },
    replyFileImage: {
        width: 60,
        height: 60,
        borderRadius: 4,
    },
    replyVideoContainer: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
    },
    replyFileText: {
        fontSize: 12,
        color: '#333',
        fontStyle: 'italic',
    },
    // Thêm vào styles
    replyFileImage: {
        width: 60,
        height: 60,
        borderRadius: 4,
    },
    replyVideoContainer: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
    },
    replyFileText: {
        fontSize: 12,
        color: '#333',
        fontStyle: 'italic',
    }, fileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
    },
    fileIcon: {
        fontSize: 24,
        marginRight: 8,
    },
    fileInfo: {
        flex: 1,
    },
    fileName: {
        color: 'blue',
        fontWeight: 'bold',
    },
    fileSize: {
        fontSize: 12,
        color: '#666',
    },

    // Format thời gian thống nhất với web
    timeText: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
        alignSelf: 'flex-end'
    },
});

export default ChatContainer;