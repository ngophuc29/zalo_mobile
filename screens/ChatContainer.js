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
} from 'react-native';
import EmojiSelector, { Categories } from 'react-native-emoji-selector';
import GroupDetailsModal from './GroupDetailsModal';
import { Video } from 'expo-av';
import FileUploaderMobile from './FileUploaderMobile';
import ImageUploaderMobile from './ImageUploaderMobile';
import FileUploader from './FileUploaderMobile';
import { Platform, Linking } from 'react-native';
// Thêm vào phần import
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

    // Group chat related props
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
                createdAt: new Date().toISOString(), // Thêm thời gian gửi tin nhắn
            };
            sendMessage(msgObj);
            setMessage('');
        }
        setShowEmojiPicker(false);
    };

    // Xử lý khi upload thành công
    const handleImageUploadSuccess = (url) => {
        sendMessage({
            id: Date.now(),
            name: myname,
            message: '',
            room: currentRoom,
            fileUrl: url,
            fileType: 'image',
            createdAt: new Date().toISOString(), // Thêm thời gian gửi tin nhắn
        });
        setShowImageUploader(false);
    };
    // Xử lý khi upload thành công
    const handleFileUploadSuccess = (fileData) => {
        sendMessage({
            id: Date.now(),
            name: myname,
            message: '',
            room: currentRoom,
            fileUrl: fileData.url,
            fileType: fileData.type,
            fileName: fileData.name,
            fileSize: fileData.size,
            createdAt: new Date().toISOString(),
        });
        setShowFileUploader(false);
    }
    // Hàm xử lý khi MediaUploader upload thành công
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
            createdAt: new Date().toISOString(),
        });
        setShowMediaUploader(false);
    };

    const onChooseEmotion = (msgId, emotionId) => {
        console.log("Chosen emotion:", { msgId, emotionId });
        handleChooseEmotion(msgId, emotionId);
    };

    const renderMessageItem = (msg) => {
        const isMine = msg.name === myname;

        const formatTime = (timestamp) => {
            if (!timestamp) return '';
            const date = new Date(timestamp);
            return date.toLocaleString([], {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
        };

        return (
            <View key={getMessageId(msg)} style={[styles.messageItemContainer, { flexDirection: isMine ? 'row-reverse' : 'row' }]}>
                {/* Nội dung tin nhắn */}
                <View style={[styles.messageItem, { alignSelf: isMine ? 'flex-end' : 'flex-start' }]}>
                    <View style={[styles.bubble, { backgroundColor: isMine ? "#dcf8c6" : "#fff" }]}>
                        {msg.name !== myname && <Text style={styles.senderName}>{msg.name}</Text>}
                        {msg.message ? <Text style={styles.messageText}>{msg.message}</Text> : null}
                        {msg.fileUrl && (
                            <View style={{ marginTop: 5 }}>
                                {/\.(jpe?g|png|gif|webp)$/i.test(msg.fileUrl) ? (
                                    <Image
                                        source={{ uri: msg.fileUrl }}
                                        style={styles.image}
                                    />
                                ) : /\.(mp4|webm|ogg)$/i.test(msg.fileUrl) ? (
                                    <Video
                                        source={{ uri: msg.fileUrl }}
                                        style={styles.video}
                                        useNativeControls
                                        resizeMode="contain"
                                    />
                                ) : (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(msg.fileUrl)}&embedded=true`;
                                                    Linking.openURL(googleViewerUrl);
                                                }}
                                            >
                                                <Text style={styles.downloadLink}>
                                                    {msg.fileName || 'Download File'}
                                                </Text>
                                            </TouchableOpacity>
                                )}
                            </View>
                        )}
                        <Text style={styles.timestamp}>{formatTime(msg.createdAt)}</Text>
                        {msg.reaction && (
                            <Text style={styles.reaction}>{emotions[msg.reaction - 1].icon}</Text>
                        )}
                    </View>
                </View>

                {/* Nút hành động */}
                <View style={styles.actionButtonsContainer}>
                    {/* Nút reaction */}
                    <TouchableOpacity
                        style={styles.reactionButton}
                        onPress={() =>
                            setActiveEmotionMsgId(
                                getMessageId(msg) === activeEmotionMsgId ? null : getMessageId(msg)
                            )
                        }
                    >
                        <Text style={styles.reactionButtonText}>😊</Text>
                    </TouchableOpacity>
                    {/* Nút xóa */}
                    {isMine && (
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteMessage(getMessageId(msg), currentRoom)}
                        >
                            <Text style={styles.deleteButtonText}>Xóa</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Picker cảm xúc */}
                {activeEmotionMsgId === getMessageId(msg) && (
                    <View style={styles.reactionPicker}>
                        {emotions.map((emotion) => (
                            <TouchableOpacity
                                key={emotion.id}
                                onPress={() => {
                                    onChooseEmotion(getMessageId(msg), emotion.id);
                                    setActiveEmotionMsgId(null);
                                }}
                            >
                                <Text style={styles.emojiText}>{emotion.icon}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header với nút Back và Group Details */}
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>👈</Text>
                </TouchableOpacity>
                <Text style={styles.roomHeader}>Chat Room: {currentRoom}</Text>
                <TouchableOpacity style={styles.groupDetailsButton} onPress={onGetGroupDetails}>
                    <Text style={styles.groupDetailsButtonText}>Group Details</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.messageContainer} ref={scrollViewRef}>
                {messages.map(msg => renderMessageItem(msg))}
            </ScrollView>

            <View style={styles.inputContainer}>
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
                    <ScrollView contentContainerStyle={{ padding: 5 }}>
                        <EmojiSelector
                            onEmojiSelected={(emoji) => {
                                setMessage(prev => prev + emoji);
                                setShowEmojiPicker(false);
                            }}
                            showSearchBar={true}
                            category={Categories.all}
                        />
                    </ScrollView>
                </View>
            )}
            {/* Image/File uploader overlay */}
            {showImageUploader && (
                <View style={styles.uploaderOverlay}>
                    <ImageUploaderMobile onUploadSuccess={handleImageUploadSuccess} />
                    <Button title="Đóng" onPress={() => setShowImageUploader(false)} />
                </View>
            )}

            {/* {showFileUploader && (
                <View style={styles.uploaderOverlay}>
                    <FileUploader 
                        onUploadSuccess={handleFileUploadSuccess}
                         
                    />
                    <Button title="Đóng" onPress={() => setShowFileUploader(false)} />
                </View>
            )} */}


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

export default ChatContainer;

const styles = StyleSheet.create({
    container: { flex: 1, padding: 10, backgroundColor: "#fff" },
    headerContainer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    backButton: { padding: 5, backgroundColor: "#007bff", borderRadius: 4 },
    backButtonText: { color: "#fff" },
    roomHeader: { fontSize: 20, flex: 1, marginLeft: 10 },
    groupDetailsButton: { backgroundColor: "#6c757d", padding: 8, borderRadius: 4 },
    groupDetailsButtonText: { color: "#fff" },
    messageContainer: { flex: 1, marginVertical: 10 },
    inputContainer: { flexDirection: "row", alignItems: "center" },
    input: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 4, padding: 8 },
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
    },
    imageUploaderContainer: {
        position: "absolute",
        bottom: 60,
        left: 20,
        backgroundColor: "#f9f9f9",
        padding: 10,
        borderRadius: 10
    },
    fileUploaderContainer: {
        position: "absolute",
        bottom: 60,
        left: 20,
        backgroundColor: "#f9f9f9",
        padding: 10,
        borderRadius: 10
    },
    uploadPrompt: { marginBottom: 5 },
    uploadButton: { color: "#007bff" },
    messageItem: { marginBottom: 10, maxWidth: "80%" },
    actionContainer: { flexDirection: "row", alignItems: "center" },
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
    deleteButton: {
        marginTop: 5,
        alignSelf: 'flex-end',
        backgroundColor: '#ff4d4d',
        padding: 5,
        borderRadius: 5,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
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
    image: { width: 200, height: 200, borderRadius: 5, marginTop: 5 },
    video: { width: 200, height: 200, borderRadius: 5, marginTop: 5 },
    downloadLink: { color: "blue", textDecorationLine: "underline", marginTop: 5 },
    reaction: {
        position: "absolute",
        bottom: -10,
        right: 4,
        backgroundColor: "blue",
        borderRadius: 10,
        padding: 3,
        color: "#fff"
    },
    imageUploaderOverlay: {
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
    closeUploaderBtn: {
        marginTop: 8,
        alignSelf: 'flex-end',
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
    uploadingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        backgroundColor: '#f5f5f5',
        borderRadius: 5,
        marginTop: 10
    },
    closeBtn: {
        backgroundColor: '#f0f0f0',
        padding: 8,
        borderRadius: 5,
        alignSelf: 'center',
        marginTop: 10
    },
    timestamp: {
        fontSize: 12,
        color: '#888',
        marginTop: 5,
        textAlign: 'right',
    },
    reactionButton: {
        marginTop: 5,
        alignSelf: 'flex-end',
        backgroundColor: '#f0f0f0',
        padding: 5,
        borderRadius: 5,
    },
    reactionButtonText: {
        fontSize: 16,
        color: '#888',
    },
    reactionPicker: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: -40,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 5,
    },
    emojiText: {
        fontSize: 20,
        marginHorizontal: 5,
    },
    messageItemContainer: {
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    actionButtonsContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 5,
    },
    reactionButton: {
        backgroundColor: '#f0f0f0',
        padding: 5,
        borderRadius: 5,
        marginBottom: 5,
    },
    reactionButtonText: {
        fontSize: 16,
        color: '#888',
    },
    deleteButton: {
        backgroundColor: '#ff4d4d',
        padding: 5,
        borderRadius: 5,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
});
