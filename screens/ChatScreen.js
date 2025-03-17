import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Alert,
} from 'react-native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import ChatContainer from './ChatContainer';
import GroupChatModal from './GroupChatModal';

const socket = io("http://localhost:5000");

const emotions = [
    { id: 1, icon: "❤️" },
    { id: 2, icon: "😊" },
    { id: 3, icon: "😮" },
    { id: 4, icon: "😒" },
    { id: 5, icon: "😡" },
];

const getMessageId = (msg) => {
    if (msg._id) return msg._id.toString();
    if (msg.id) return msg.id.toString();
    return null;
};

const showToast = (title, message, type = 'info') => {
    Toast.show({
        type, // 'success', 'error', 'info'
        text1: title,
        text2: message,
        position: 'top',
        visibilityTime: 3000,
    });
};

const ChatScreen = () => {
    // State liên quan đến chat
    const [username, setUsername] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [searchFilter, setSearchFilter] = useState('');
    const [filteredAccounts, setFilteredAccounts] = useState([]);
    const [activeChats, setActiveChats] = useState({});
    const [activeRoom, setActiveRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [activeEmotionMsgId, setActiveEmotionMsgId] = useState(null);

    // State dành cho Group Chat
    const [groupModalVisible, setGroupModalVisible] = useState(false);
    const [groupDetailsVisible, setGroupDetailsVisible] = useState(false);
    const [groupInfo, setGroupInfo] = useState(null);
    const [groupName, setGroupName] = useState("");
    const [selectedMembers, setSelectedMembers] = useState([]);

    // Các ref hỗ trợ
    const joinedRoomsRef = useRef(new Set());
    const processedUnreadMessagesRef = useRef(new Set());

    // Đăng ký username cho socket khi component mount
    useEffect(() => {
        AsyncStorage.getItem('username')
            .then(storedUsername => {
                if (storedUsername) {
                    setUsername(storedUsername);
                    socket.emit("registerUser", storedUsername);
                }
            })
            .catch(error => console.error("Error fetching username:", error));
    }, []);

    // Lắng nghe event "groupDetailsResult" để cập nhật thông tin nhóm realtime
    useEffect(() => {
        if (!socket) return;
        const onGroupDetailsResult = (data) => {
            try {
                const result = typeof data === 'string' ? JSON.parse(data) : data;
                if (result.success) {
                    setGroupInfo(result.group);
                    setGroupDetailsVisible(true);
                } else {
                    showToast("Error", result.message, "error");
                }
            } catch (error) {
                console.error("Error parsing groupDetailsResult:", error);
            }
        };
        socket.on("groupDetailsResult", onGroupDetailsResult);
        return () => {
            socket.off("groupDetailsResult", onGroupDetailsResult);
        };
    }, [socket]);

    // Khi modal chi tiết nhóm đang mở, nếu có sự thay đổi (groupUpdated) thì refresh thông tin nhóm
    useEffect(() => {
        if (!socket) return;
        const onGroupUpdated = (data) => {
            if (groupDetailsVisible && activeRoom) {
                socket.emit("getGroupDetails", { roomId: activeRoom });
            }
        };
        socket.on("groupUpdated", onGroupUpdated);
        return () => {
            socket.off("groupUpdated", onGroupUpdated);
        };
    }, [socket, groupDetailsVisible, activeRoom]);

    // Fetch danh sách tài khoản
    useEffect(() => {
        fetch("http://localhost:5000/api/accounts")
            .then(res => res.json())
            .then(data => setAccounts(data))
            .catch(err => console.error("Error fetching accounts:", err));
    }, []);

    // Lọc tài khoản theo searchFilter
    useEffect(() => {
        if (searchFilter.trim().length > 0) {
            const filtered = accounts.filter(acc =>
                acc.username.toLowerCase().includes(searchFilter.toLowerCase())
            );
            setFilteredAccounts(filtered);
        } else {
            setFilteredAccounts([]);
        }
    }, [searchFilter, accounts]);

    // Lấy danh sách cuộc trò chuyện qua socket
    useEffect(() => {
        if (!socket || !username) return;
        socket.emit("getUserConversations", username);
        const onUserConversations = (data) => {
            try {
                const conversationData = JSON.parse(data);
                let chats = {};
                if (conversationData.privateChats) {
                    conversationData.privateChats.forEach(chat => {
                        chats[chat.roomId] = {
                            partner: chat.friend,
                            unread: 0,
                            messages: chat.messages || [],
                        };
                    });
                }
                if (conversationData.groupChats) {
                    conversationData.groupChats.forEach(chat => {
                        chats[chat.roomId] = {
                            partner: chat.groupName,
                            unread: 0,
                            messages: chat.messages || [],
                            isGroup: true,
                        };
                    });
                }
                setActiveChats(chats);
            } catch (error) {
                console.error("Error parsing userConversations:", error);
            }
        };
        socket.on("userConversations", onUserConversations);
        return () => {
            socket.off("userConversations", onUserConversations);
        };
    }, [socket, username]);

    // Lắng nghe event "history" khi join room để load tin nhắn
    useEffect(() => {
        if (!socket || !activeRoom) return;
        const onHistory = (data) => {
            try {
                const history = JSON.parse(data);
                setMessages(history);
            } catch (error) {
                console.error("Error parsing history:", error);
            }
        };
        socket.on("history", onHistory);
        return () => {
            socket.off("history", onHistory);
        };
    }, [socket, activeRoom]);

    // Lắng nghe event "reactionHistory" để load reaction từ backend
    useEffect(() => {
        if (!socket || !activeRoom) return;
        const onReactionHistory = (data) => {
            try {
                const reactions = JSON.parse(data);
                setMessages(prev => {
                    const updated = [...prev];
                    reactions.forEach(reaction => {
                        const idx = updated.findIndex(msg =>
                            getMessageId(msg).toString() === reaction.messageId.toString()
                        );
                        if (idx !== -1) {
                            updated[idx].reaction = reaction.emotion;
                        }
                    });
                    return updated;
                });
            } catch (error) {
                console.error("Error parsing reaction history:", error);
            }
        };
        socket.on("reactionHistory", onReactionHistory);
        return () => {
            socket.off("reactionHistory", onReactionHistory);
        };
    }, [socket, activeRoom]);

    // Lắng nghe event "emotion" để cập nhật reaction realtime
    useEffect(() => {
        if (!socket) return;
        const onEmotion = (data) => {
            try {
                const reactionObj = JSON.parse(data);
                console.log("Received emotion:", reactionObj);
                setMessages(prev =>
                    prev.map(msg =>
                        getMessageId(msg).toString() === reactionObj.messageId.toString()
                            ? { ...msg, reaction: reactionObj.emotion }
                            : msg
                    )
                );
            } catch (error) {
                console.error("Error parsing emotion:", error);
            }
        };
        socket.on("emotion", onEmotion);
        return () => {
            socket.off("emotion", onEmotion);
        };
    }, [socket]);

    // *** Thêm sự kiện "thread" để realtime nhận tin nhắn mới (bao gồm group chat) ***
    useEffect(() => {
        if (!socket) return;
        const onThread = (data) => {
            try {
                const newMsg = JSON.parse(data);
                setMessages(prev => [...prev, newMsg]);
            } catch (error) {
                console.error("Error parsing thread:", error);
            }
        };
        socket.on("thread", onThread);
        return () => {
            socket.off("thread", onThread);
        };
    }, [socket]);

    // Hàm gửi tin nhắn
    const sendMessageHandler = (msgObj) => {
        if (!activeRoom) {
            showToast("Error", "Please select a chat first.", "error");
            return;
        }
        socket.emit("message", JSON.stringify(msgObj));
        setMessages(prev => [...prev, msgObj]);
    };

    // Khi bấm vào chat từ danh sách
    const handleRoomClick = (room) => {
        setActiveRoom(room);
        socket.emit("join", room);
        setMessages([]);
    };

    // Khi bấm vào kết quả tìm kiếm người dùng
    const handleUserClick = (targetUser) => {
        if (targetUser === username) return;
        const room = [username, targetUser].sort().join("-");
        setActiveRoom(room);
        socket.emit("join", room);
        setMessages([]);
        setActiveChats(prev => ({
            ...prev,
            [room]: { partner: targetUser, unread: 0, messages: [] },
        }));
    };

    // Hàm gửi reaction (optimistic update)
    const handleChooseEmotion = (msgId, emotionId) => {
        const reactionData = {
            messageId: msgId.toString(),
            user: username,
            emotion: emotionId,
            room: activeRoom,
        };
        console.log("Emitting reaction:", reactionData);
        socket.emit("emotion", JSON.stringify(reactionData));
        setMessages(prev =>
            prev.map(msg =>
                getMessageId(msg).toString() === msgId.toString()
                    ? { ...msg, reaction: emotionId }
                    : msg
            )
        );
    };

    // --- Các hàm quản lý Group Chat ---
    const handleRemoveGroupMember = (roomId, member) => {
        socket.emit("removeGroupMember", { roomId, memberToRemove: member });
        showToast("Remove Member", `Removed ${member}`, "info");
    };

    const handleTransferGroupOwner = (roomId, newOwner) => {
        socket.emit("transferGroupOwner", { roomId, newOwner });
        showToast("Transfer Ownership", `Ownership transferred to ${newOwner}`, "info");
    };

    const handleAssignDeputy = (roomId, member) => {
        socket.emit("assignDeputy", { roomId, member });
        showToast("Assign Deputy", `Deputy assigned to ${member}`, "info");
    };

    const handleCancelDeputy = (roomId, member) => {
        socket.emit("cancelDeputy", { roomId, member });
        showToast("Cancel Deputy", `Deputy role cancelled for ${member}`, "info");
    };

    const handleAddGroupMember = (newMember) => {
        if (newMember.trim() === "") {
            showToast("Thông báo", "Vui lòng nhập username của thành viên cần thêm", "error");
            return;
        }
        socket.emit("addGroupMember", { roomId: activeRoom, newMember });
    };

    const handleLeaveGroup = () => {
        socket.emit("leaveGroup", { roomId: activeRoom });
        setGroupDetailsVisible(false);
        showToast("Leave Group", "You have left the group", "info");
        setActiveChats(prev => {
            const updated = { ...prev };
            delete updated[activeRoom];
            return updated;
        });
        setActiveRoom(null);
    };

    const handleDisbandGroup = () => {
        socket.emit("disbandGroup", { roomId: activeRoom });
        setGroupDetailsVisible(false);
        showToast("Disband Group", "The group has been disbanded", "info");
        setActiveChats(prev => {
            const updated = { ...prev };
            delete updated[activeRoom];
            return updated;
        });
        setActiveRoom(null);
    };

    // Lắng nghe event "newGroupChat" để cập nhật chat list sau khi tạo nhóm
    useEffect(() => {
        if (!socket) return;
        const onNewGroupChat = (data) => {
            try {
                const groupChat = JSON.parse(data);
                setActiveChats(prev => ({
                    ...prev,
                    [groupChat.roomId]: {
                        partner: groupChat.groupName,
                        unread: 0,
                        messages: [],
                        isGroup: true,
                    },
                }));
                showToast("Nhóm Chat", "Nhóm chat mới đã được tạo: " + groupChat.groupName, "success");
            } catch (error) {
                console.error("Error parsing newGroupChat:", error);
            }
        };
        socket.on("newGroupChat", onNewGroupChat);
        return () => {
            socket.off("newGroupChat", onNewGroupChat);
        };
    }, [socket]);

    // Hàm tạo nhóm chat
    const handleCreateGroup = () => {
        if (!groupName) {
            showToast("Thông báo", "Vui lòng nhập tên nhóm", "error");
            return;
        }
        if (selectedMembers.length === 0) {
            showToast("Thông báo", "Chọn ít nhất 1 thành viên", "error");
            return;
        }
        socket.emit("createGroupChat", { groupName, members: selectedMembers });
        setGroupModalVisible(false);
        setGroupName("");
        setSelectedMembers([]);
    };

    const chatList = Object.keys(activeChats).map(room => ({ room, ...activeChats[room] }));
    const isSearching = searchFilter.trim().length > 0;

    if (activeRoom) {
        return (
            <ChatContainer
                currentRoom={activeRoom}
                messages={messages}
                myname={username}
                sendMessage={sendMessageHandler}
                message={message}
                setMessage={setMessage}
                handleDeleteMessage={(msgId, room) =>
                    showToast("Delete", `Delete message ${msgId}`, "info")
                }
                handleChooseEmotion={handleChooseEmotion}
                activeEmotionMsgId={activeEmotionMsgId}
                setActiveEmotionMsgId={setActiveEmotionMsgId}
                emotions={emotions}
                getMessageId={getMessageId}
                onGetGroupDetails={() =>
                    activeChats[activeRoom] && activeChats[activeRoom].isGroup
                        ? socket.emit("getGroupDetails", { roomId: activeRoom })
                        : showToast("Thông báo", "This is not a group chat.", "info")
                }
                onBack={() => setActiveRoom(null)}
                // Các props group details truyền xuống ChatContainer để render modal GroupDetails (nếu có)
                groupDetailsVisible={groupDetailsVisible}
                groupInfo={groupInfo}
                handleRemoveGroupMember={handleRemoveGroupMember}
                handleTransferGroupOwner={handleTransferGroupOwner}
                handleAssignDeputy={handleAssignDeputy}
                handleCancelDeputy={handleCancelDeputy}
                handleAddGroupMember={handleAddGroupMember}
                handleLeaveGroup={handleLeaveGroup}
                handleDisbandGroup={handleDisbandGroup}
                setGroupDetailsVisible={setGroupDetailsVisible}
            />
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search user by name"
                    value={searchFilter}
                    onChangeText={setSearchFilter}
                />
                {isSearching ? (
                    <TouchableOpacity style={styles.button} onPress={() => setSearchFilter('')}>
                        <Text style={styles.buttonText}>Đóng</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => showToast("Friend Modal", "Open friend modal", "info")}
                    >
                        <Text style={styles.buttonText}>Kết bạn</Text>
                    </TouchableOpacity>
                )}
            </View>
            {isSearching ? (
                <FlatList
                    data={filteredAccounts}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.listItem} onPress={() => handleUserClick(item.username)}>
                            <Text style={styles.itemLabel}>
                                UserName: <Text style={styles.itemValue}>{item.username}</Text>
                            </Text>
                            <Text style={styles.itemLabel}>
                                FullName: <Text style={styles.itemValue}>{item.fullname}</Text>
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            ) : (
                <View style={{ flex: 1 }}>
                    <View style={styles.chatHeader}>
                        <Text style={styles.chatHeaderText}>Chats</Text>
                        <TouchableOpacity style={styles.addButton} onPress={() => setGroupModalVisible(true)}>
                            <Text style={styles.addButtonText}>+</Text>
                        </TouchableOpacity>
                    </View>
                    {chatList.length === 0 ? (
                        <View style={styles.noChatsContainer}>
                            <Text style={styles.noChatsText}>Không có cuộc trò chuyện nào.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={chatList}
                            keyExtractor={(item) => item.room}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.chatItem,
                                        { backgroundColor: item.room === activeRoom ? '#f0f8ff' : 'transparent' },
                                    ]}
                                    onPress={() => handleRoomClick(item.room)}
                                >
                                    <Text>{item.partner}</Text>
                                    {item.unread > 0 && (
                                        <View style={styles.unreadBadge}>
                                            <Text style={styles.unreadText}>{item.unread}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            )}
            {groupModalVisible && (
                <GroupChatModal
                    groupName={groupName}
                    setGroupName={setGroupName}
                    accounts={accounts}
                    selectedMembers={selectedMembers}
                    setSelectedMembers={setSelectedMembers}
                    myname={username}
                    setGroupModalVisible={setGroupModalVisible}
                    handleCreateGroup={handleCreateGroup}
                />
            )}
            <Toast />
        </View>
    );
};

export default ChatScreen;

const styles = StyleSheet.create({
    container: { flex: 1, padding: 10, backgroundColor: "#fff" },
    searchContainer: { flexDirection: "row", marginBottom: 10 },
    searchInput: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 4, padding: 8 },
    button: { backgroundColor: "#007bff", paddingVertical: 8, paddingHorizontal: 12, marginLeft: 8, borderRadius: 4, justifyContent: "center" },
    buttonText: { color: "#fff" },
    listItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#ddd" },
    itemLabel: { fontWeight: "bold" },
    itemValue: { fontWeight: "normal" },
    chatHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    chatHeaderText: { fontSize: 24 },
    addButton: { backgroundColor: "#007bff", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
    addButtonText: { color: "#fff", fontSize: 24 },
    chatItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#ddd", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    unreadBadge: { backgroundColor: "red", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
    unreadText: { color: "#fff", fontSize: 12 },
    noChatsContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
    noChatsText: { fontSize: 16, color: "#888" },
});
