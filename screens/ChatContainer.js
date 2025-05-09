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
} from 'react-native';
import EmojiSelector, { Categories } from 'react-native-emoji-selector';
import GroupDetailsModal from './GroupDetailsModal';
import { Video } from 'expo-av';
import FileUploaderMobile from './FileUploaderMobile';
import ImageUploaderMobile from './ImageUploaderMobile';
import FileUploader from './FileUploaderMobile';
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
                room: currentRoom, createdAt: new Date().toISOString(),
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
            fileType: 'image'
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
            fileSize: fileData.size
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
        });
        setShowMediaUploader(false);
    };

    const getDisplayName = (roomName) => {
        if (!roomName) return '';
        // Kiểm tra xem có phải là chat 1-1 không
        if (roomName.includes('-')) {
            // Chat 1-1: lấy tên partner (phần sau dấu -)
            return roomName.split('-')[1];
        } else {
            // Group chat: bỏ dãy số phía sau dấu _
            return roomName.split('_')[0];
        }
    };

    const isGroupChat = (roomName) => {
        return !roomName.includes('-');
    };

    const onChooseEmotion = (msgId, emotionId) => {
        console.log("Chosen emotion:", { msgId, emotionId });
        handleChooseEmotion(msgId, emotionId);
    };
     
    // const renderMessageItem = (msg) => {
    //     const isMine = msg.name === myname;
    //     return (
    //         <View key={getMessageId(msg)} style={[styles.messageItem, { alignSelf: isMine ? 'flex-end' : 'flex-start' }]}>
    //             {isMine && (
    //                 <View style={styles.actionContainer}>
    //                     <TouchableOpacity
    //                         onPress={() =>
    //                             setActiveEmotionMsgId(
    //                                 getMessageId(msg) === activeEmotionMsgId ? null : getMessageId(msg)
    //                             )
    //                         }
    //                     >
    //                         <Text style={styles.emotionIcon}>😊</Text>
    //                     </TouchableOpacity>
    //                     {activeEmotionMsgId === getMessageId(msg) && (
    //                         <View style={styles.emojiPicker}>
    //                             {emotions.map(em => (
    //                                 <TouchableOpacity
    //                                     key={em.id}
    //                                     onPress={() => {
    //                                         onChooseEmotion(getMessageId(msg), em.id);
    //                                         setActiveEmotionMsgId(null);
    //                                     }}
    //                                     style={styles.emojiButton}
    //                                 >
    //                                     <Text style={styles.emojiText}>{em.icon}</Text>
    //                                 </TouchableOpacity>
    //                             ))}
    //                         </View>
    //                     )}
    //                     <TouchableOpacity onPress={() => handleDeleteMessage(getMessageId(msg), msg.room)}>
    //                         <Text style={styles.deleteButton}>X</Text>
    //                     </TouchableOpacity>
    //                 </View>
    //             )}
    //             <View style={[styles.bubble, { backgroundColor: isMine ? "#dcf8c6" : "#fff" }]}>
    //                 {msg.name !== myname && <Text style={styles.senderName}>{msg.name}</Text>}
    //                 {msg.message ? <Text style={styles.messageText}>{msg.message}</Text> : null}
    //                 {msg.fileUrl && (
    //                     <div className="file-preview mb-2">
    //                         {/\.(jpe?g|png|gif|webp)$/i.test(msg.fileUrl) ? (
    //                             <img
    //                                 src={msg.fileUrl}
    //                                 alt="uploaded"
    //                                 className="img-thumbnail"
    //                                 style={{ maxWidth: '200px', borderRadius: '8px' }}
    //                             />
    //                         ) : /\.(mp4|webm|ogg)$/i.test(msg.fileUrl) ? (
    //                             <video
    //                                 controls
    //                                 poster={msg.thumbnailUrl}
    //                                 style={{ display: 'block', maxWidth: '200px', borderRadius: '8px' }}
    //                             >
    //                                 <source src={msg.fileUrl} />
    //                             </video>
    //                         ) : (
    //                             <a
    //                                 href={msg.fileUrl}
    //                                 download={msg.fileName || 'file'}
    //                                 className="btn btn-sm btn-outline-primary"
    //                             >
    //                                 <i className="fas fa-file-download me-1" />
    //                                 {msg.fileName || 'Tải xuống tài liệu'}
    //                             </a>
    //                         )}
    //                     </div>
    //                 )}

    //                 {msg.reaction ? (
    //                     <Text style={styles.reaction}>{emotions[msg.reaction - 1].icon}</Text>
    //                 ) : null}
    //             </View>
    //             {!isMine && (
    //                 <View style={styles.actionContainer}>
    //                     <TouchableOpacity
    //                         onPress={() =>
    //                             setActiveEmotionMsgId(
    //                                 getMessageId(msg) === activeEmotionMsgId ? null : getMessageId(msg)
    //                             )
    //                         }
    //                     >
    //                         <Text style={styles.emotionIcon}>😊</Text>
    //                     </TouchableOpacity>
    //                     {activeEmotionMsgId === getMessageId(msg) && (
    //                         <View style={styles.emojiPickerRight}>
    //                             {emotions.map(em => (
    //                                 <TouchableOpacity
    //                                     key={em.id}
    //                                     onPress={() => {
    //                                         onChooseEmotion(getMessageId(msg), em.id);
    //                                         setActiveEmotionMsgId(null);
    //                                     }}
    //                                     style={styles.emojiButton}
    //                                 >
    //                                     <Text style={styles.emojiText}>{em.icon}</Text>
    //                                 </TouchableOpacity>
    //                             ))}
    //                         </View>
    //                     )}
    //                 </View>
    //             )}
    //         </View>
    //     );
    // };


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

                    {msg.fileUrl && (
                        <View style={{ marginTop: 5 }}>                            {/\.(jpe?g|png|gif|webp)$/i.test(msg.fileUrl) ? (
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
                                <TouchableOpacity onPress={() => Linking.openURL(msg.fileUrl)}>
                                    <Text style={{ color: 'blue' }}>{msg.fileName || 'Tải xuống tài liệu'}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {msg.reaction && (
                        <Text style={styles.reaction}>{emotions[msg.reaction - 1].icon}</Text>
                    )}

                    {/* ✅ Hiển thị thời gian gửi */}
                    <Text style={styles.timeText}>{formatTime(msg.createdAt)}</Text>
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
            {/* Header với nút Back và Group Details */}            <View style={styles.headerContainer}>
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
        shadowRadius: 4, overflow:'hidden'
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
    },timeText: {
        fontSize: 10,
        color: '#888',
        marginTop: 4,
        alignSelf: 'flex-end'
    }

});