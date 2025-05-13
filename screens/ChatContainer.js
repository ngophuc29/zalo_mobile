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
    Linking
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
}) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showImageUploader, setShowImageUploader] = useState(false);
    const [showFileUploader, setShowFileUploader] = useState(false);
    const [showMediaUploader, setShowMediaUploader] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const scrollViewRef = useRef();

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

            // CHỈ thêm replyTo nếu đang thực sự reply
            if (replyingTo) {
                msgObj.replyTo = replyingTo;
            }

            sendMessage(msgObj);
            setMessage('');
            setReplyingTo(null); // Reset sau khi gửi
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

        sendMessage(fileMessage);
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

        sendMessage(fileMessage);
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
            return roomName.split('-')[1];
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

    const renderMessageItem = (msg) => {
        const isMine = msg.name === myname;

        return (
            <View key={getMessageId(msg)} style={[styles.messageItem, { alignSelf: isMine ? 'flex-end' : 'flex-start' }]}>
                {isMine && (
                    <View style={styles.actionContainer}>
                        <TouchableOpacity onPress={() => handleReply(msg)}>
                            <Text style={styles.actionIcon}>↩️</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() =>
                                setActiveEmotionMsgId(
                                    getMessageId(msg) === activeEmotionMsgId ? null : getMessageId(msg)
                                )
                            }
                        >
                            <Text style={styles.emotionIcon}>😊</Text>
                        </TouchableOpacity>
                        {activeEmotionMsgId === getMessageId(msg) && (
                            <View style={styles.emojiPicker}>
                                {emotions.map(em => (
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
                        <TouchableOpacity onPress={() => handleDeleteMessage(getMessageId(msg), msg.room)}>
                            <Text style={styles.deleteButton}>X</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={[styles.bubble, { backgroundColor: isMine ? "#dcf8c6" : "#fff" }]}>
                    {msg.name !== myname && <Text style={styles.senderName}>{msg.name}</Text>}

                    {msg.replyTo && msg.replyTo.id && msg.replyTo.name && (msg.replyTo.message || msg.replyTo.fileUrl) && (() => {
                        const originalExists = messages.some(
                            m => (m._id === msg.replyTo.id || m.id === msg.replyTo.id)
                        );

                        return (
                            <View style={styles.replyPreview}>
                                <Text style={styles.replyToText}>Replying to {msg.replyTo.name}</Text>

                                {msg.replyTo.message ? (
                                    // --- Text reply ---
                                    <Text style={[
                                        styles.replyMessageText,
                                        !originalExists && styles.deletedReply
                                    ]}>
                                        {originalExists
                                            ? msg.replyTo.message
                                            : "Tin nhắn đã bị xóa"}
                                    </Text>

                                ) : msg.replyTo.fileUrl ? (
                                    // --- File reply ---
                                    !originalExists ? (
                                        // File gốc đã bị xóa
                                        <Text style={[styles.replyFileText, styles.deletedReply]}>
                                            Tin nhắn đã bị xóa
                                        </Text>
                                    ) : (
                                        // File gốc còn, render preview
                                        <View style={styles.replyFilePreview}>
                                            {/\.(jpe?g|png|gif|webp)$/i.test(msg.replyTo.fileUrl) ? (
                                                <Image
                                                    source={{ uri: msg.replyTo.fileUrl }}
                                                    style={styles.replyFileImage}
                                                />
                                            ) : /\.(mp4|webm|ogg)$/i.test(msg.replyTo.fileUrl) ? (
                                                <View style={styles.replyVideoContainer}>
                                                    <Text style={styles.replyFileText}>[Video]</Text>
                                                </View>
                                            ) : (
                                                <Text style={styles.replyFileText}>
                                                    [File] {msg.replyTo.fileName || 'Tệp đính kèm'}
                                                </Text>
                                            )}
                                        </View>
                                    )
                                ) : null}
                            </View>
                        );
                    })()}


                    {msg.message ? <Text style={styles.messageText}>{msg.message}</Text> : null}

                    {msg.fileUrl && (
                        <View style={{ marginTop: 5 }}>
                            {/\.(jpe?g|png|gif|webp)$/i.test(msg.fileUrl) ? (
                                <Image
                                    source={{ uri: msg.fileUrl }}
                                    style={{ width: 200, height: 200, borderRadius: 8 }}
                                    resizeMode="cover"
                                />
                            ) : /\.(mp4|webm|ogg)$/i.test(msg.fileUrl) ? (
                                <Video
                                    source={{ uri: msg.fileUrl }}
                                    style={{ width: 200, height: 200, borderRadius: 8 }}
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
                                                    {msg.fileName || msg.name || 'Tệp đính kèm'}
                                                </Text>
                                                <Text style={styles.fileSize}>
                                                    {msg.fileSize ? `(${(msg.fileSize / 1024).toFixed(2)} KB)` : ''}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {msg.reaction && (
                        <Text style={styles.reaction}>{emotions[msg.reaction - 1].icon}</Text>
                    )}

                    <Text style={styles.timeText}>{formatTime(msg.createdAt)}</Text>
                </View>

                {!isMine && (
                    <View style={styles.actionContainer}>
                        <TouchableOpacity onPress={() => handleReply(msg)}>
                            <Text style={styles.actionIcon}>↩️</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() =>
                                setActiveEmotionMsgId(
                                    getMessageId(msg) === activeEmotionMsgId ? null : getMessageId(msg)
                                )
                            }
                        >
                            <Text style={styles.emotionIcon}>😊</Text>
                        </TouchableOpacity>
                        {activeEmotionMsgId === getMessageId(msg) && (
                            <View style={styles.emojiPickerRight}>
                                {emotions.map(em => (
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
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>👈</Text>
                </TouchableOpacity>
                <Text style={styles.roomHeader}>{getDisplayName(currentRoom)}</Text>
                {isGroupChat(currentRoom) && (
                    <TouchableOpacity style={styles.groupDetailsButton} onPress={onGetGroupDetails}>
                        <Text style={styles.groupDetailsButtonText}>Group Details</Text>
                    </TouchableOpacity>
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