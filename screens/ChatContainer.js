// ChatContainer.js
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
} from 'react-native';

const ChatContainer = ({
    currentRoom,
    messages,
    myname,
    sendMessage,
    message,
    setMessage,
    handleDeleteMessage,
    handleChooseEmotion, // Hàm này được truyền từ ChatScreen và sẽ emit "emotion" lên backend
    activeEmotionMsgId,
    setActiveEmotionMsgId,
    emotions, // Ví dụ: [{ id: 1, icon: "❤️" }, ...]
    getMessageId,
    onGetGroupDetails,
    onBack,
}) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showImageUploader, setShowImageUploader] = useState(false);
    const scrollViewRef = useRef(null);

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
            };
            sendMessage(msgObj);
            setMessage('');
        }
        setShowEmojiPicker(false);
    };

    const handleImageUploadSuccess = (imageUrl) => {
        const fileMessage = {
            id: Date.now(),
            name: myname,
            message: '',
            room: currentRoom,
            fileUrl: imageUrl,
        };
        sendMessage(fileMessage);
        setShowImageUploader(false);
    };

    // Wrap handleChooseEmotion để thêm log nếu cần
    const onChooseEmotion = (msgId, emotionId) => {
        console.log("Chosen emotion:", { msgId, emotionId });
        handleChooseEmotion(msgId, emotionId);
    };

    const renderMessageItem = (msg) => {
        const isMine = msg.name === myname;
        return (
            <View key={getMessageId(msg)} style={[styles.messageItem, { alignSelf: isMine ? 'flex-end' : 'flex-start' }]}>
                {isMine && (
                    <View style={styles.actionContainer}>
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
                    {msg.message ? <Text style={styles.messageText}>{msg.message}</Text> : null}
                    {msg.fileUrl ? (
                        /\.(jpg|jpeg|png|gif)$/i.test(msg.fileUrl) ? (
                            <Image source={{ uri: msg.fileUrl }} style={styles.image} resizeMode="cover" />
                        ) : (
                            <Text style={styles.downloadLink}>Download File</Text>
                        )
                    ) : null}
                    {msg.reaction ? (
                        <Text style={styles.reaction}>{emotions[msg.reaction - 1].icon}</Text>
                    ) : null}
                </View>
                {!isMine && (
                    <View style={styles.actionContainer}>
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
            {/* Header với nút Back */}
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Back</Text>
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
            </View>
            {showEmojiPicker && (
                <View style={styles.emojiPickerContainer}>
                    {emotions.map(em => (
                        <TouchableOpacity key={em.id} onPress={() => onEmojiClick(em.icon)} style={styles.emojiButton}>
                            <Text style={styles.emojiText}>{em.icon}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
            {showImageUploader && (
                <View style={styles.imageUploaderContainer}>
                    <Text style={styles.uploadPrompt}>[Image Uploader Placeholder]</Text>
                    <TouchableOpacity onPress={() => handleImageUploadSuccess("https://via.placeholder.com/150")}>
                        <Text style={styles.uploadButton}>Simulate Upload Success</Text>
                    </TouchableOpacity>
                </View>
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
    emojiPickerContainer: {
        position: "absolute",
        bottom: 70,
        right: 20,
        flexDirection: "row",
        backgroundColor: "aquamarine",
        padding: 10,
        borderRadius: 20
    },
    emojiButton: { marginHorizontal: 2 },
    emojiText: { fontSize: 18 },
    imageUploaderContainer: {
        position: "absolute",
        bottom: 70,
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
    image: { width: 200, height: 200, borderRadius: 5, marginTop: 5 },
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
});
