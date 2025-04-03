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
import FriendModal from './FriendModal';
import GroupChatModal from './GroupChatModal';
const socket = io("http://localhost:5000");

const emotions = [
    { id: 1, icon: "❤️" },
    { id: 2, icon: "😊" },
    { id: 3, icon: "😮" },
    { id: 4, icon: "😒" },
    { id: 5, icon: "😡" },
];

// Hàm tiện ích để lấy id của message dưới dạng string
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
    const [friends, setFriends] = useState([]); // Danh sách bạn của user

    const [searchFilter, setSearchFilter] = useState('');
    const [filteredAccounts, setFilteredAccounts] = useState([]);
    const [activeChats, setActiveChats] = useState({});
    const [activeRoom, setActiveRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [activeEmotionMsgId, setActiveEmotionMsgId] = useState(null);


    // State dành cho Friend Modal
    const [friendModalVisible, setFriendModalVisible] = useState(false);
    const [friendInput, setFriendInput] = useState("");

    // State dành cho Group Chat
    const [groupModalVisible, setGroupModalVisible] = useState(false);
    const [groupDetailsVisible, setGroupDetailsVisible] = useState(false);
    const [groupInfo, setGroupInfo] = useState(null);
    const [groupName, setGroupName] = useState("");
    const [selectedMembers, setSelectedMembers] = useState([]);

    // Các ref hỗ trợ
    const joinedRoomsRef = useRef(new Set());
    const processedUnreadMessagesRef = useRef(new Set());
    // Dùng để lưu room hiện tại cho sự kiện "thread"
    const currentRoomRef = useRef(activeRoom);
    useEffect(() => { currentRoomRef.current = activeRoom; }, [activeRoom]);

    // --- LOAD DỮ LIỆU activeChats từ AsyncStorage khi component mount ---
    useEffect(() => {
        AsyncStorage.getItem('activeChats')
            .then(data => {
                if (data) {
                    setActiveChats(JSON.parse(data));
                }
            })
            .catch(err => console.error("Error loading activeChats:", err));
    }, []);

    // --- LƯU activeChats vào AsyncStorage mỗi khi thay đổi ---
    useEffect(() => {
        AsyncStorage.setItem('activeChats', JSON.stringify(activeChats))
            .catch(err => console.error("Error saving activeChats:", err));
    }, [activeChats]);

    // Đăng ký username cho socket khi component mount
    useEffect(() => {
        AsyncStorage.getItem('username')
            .then(storedUsername => {
                if (storedUsername) {
                    setUsername(storedUsername);
                    socket.emit("registerUser", storedUsername);


                    // Lấy danh sách bạn từ backend
                    socket.emit("getFriends", storedUsername);
                }
            })
            .catch(error => console.error("Error fetching username:", error));
    }, []);

    // Lắng nghe danh sách bạn
    useEffect(() => {
        const onFriendsList = (friendsList) => {
            setFriends(friendsList);
        };
        socket.on("friendsList", onFriendsList);
        return () => {
            socket.off("friendsList", onFriendsList);
        };
    }, []);

    // Lắng nghe kết quả gửi lời mời kết bạn
    useEffect(() => {
        const onAddFriendResult = (data) => {
            if (data.success) {
                showToast("Kết bạn", data.message, "success");
            } else {
                showToast("Kết bạn", data.message, "error");
            }
        };
        socket.on("addFriendResult", onAddFriendResult);
        return () => {
            socket.off("addFriendResult", onAddFriendResult);
        };
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

    // Nếu modal group details đang mở, tự động refresh thông tin nếu có cập nhật
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

    // Lấy danh sách cuộc trò chuyện qua socket và tự động join tất cả các room
    useEffect(() => {
        if (!socket || !username) return;
        socket.emit("getUserConversations", username);
        const onUserConversations = (data) => {
            try {
                const conversationData = JSON.parse(data);
                let chatsFromServer = {};
                if (conversationData.privateChats) {
                    conversationData.privateChats.forEach(chat => {
                        chatsFromServer[chat.roomId] = {
                            partner: chat.friend,
                            unread: 0,
                            messages: chat.messages || [],
                        };
                    });
                }
                if (conversationData.groupChats) {
                    conversationData.groupChats.forEach(chat => {
                        chatsFromServer[chat.roomId] = {
                            partner: chat.groupName,
                            unread: 0,
                            messages: chat.messages || [],
                            isGroup: true,
                        };
                    });
                }
                // Merge với activeChats đã có (nếu có tin chưa đọc)
                const mergedChats = { ...chatsFromServer, ...activeChats };
                Object.keys(chatsFromServer).forEach(room => {
                    if (activeChats[room] && activeChats[room].unread > 0) {
                        mergedChats[room].unread = activeChats[room].unread;
                    }
                });
                setActiveChats(mergedChats);
                AsyncStorage.setItem('activeChats', JSON.stringify(mergedChats))
                    .catch(err => console.error("Error saving activeChats:", err));
                // Auto join tất cả các room để nhận realtime tin nhắn và cập nhật unread
                Object.keys(mergedChats).forEach(room => {
                    if (!joinedRoomsRef.current.has(room)) {
                        socket.emit("join", room);
                        joinedRoomsRef.current.add(room);
                    }
                });
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

    // Sự kiện "thread" để realtime nhận tin nhắn mới (bao gồm group chat)
    useEffect(() => {
        if (!socket) return;
        const onThread = (data) => {
            try {
                const newMsg = JSON.parse(data);
                setMessages(prev => {
                    // Nếu tin nhắn đã tồn tại, không thêm nữa (tránh trùng lặp)
                    if (prev.find(msg => getMessageId(msg) === getMessageId(newMsg))) {
                        return prev;
                    }
                    return [...prev, newMsg];
                });
                // Nếu tin nhắn đến từ room khác với room hiện tại, tăng số tin chưa đọc cho room đó
                if (newMsg.room !== currentRoomRef.current && newMsg && getMessageId(newMsg)) {
                    setActiveChats(prev => {
                        const updated = { ...prev };
                        if (updated[newMsg.room]) {
                            updated[newMsg.room].unread = (updated[newMsg.room].unread || 0) + 1;
                        } else {
                            updated[newMsg.room] = {
                                partner: newMsg.room.includes("_") ? (newMsg.groupName || "Group Chat") : newMsg.name,
                                unread: 1,
                                isGroup: newMsg.room.includes("_"),
                            };
                        }
                        AsyncStorage.setItem('activeChats', JSON.stringify(updated))
                            .catch(err => console.error("Error saving activeChats:", err));
                        return updated;
                    });
                }
            } catch (error) {
                console.error("Error parsing thread:", error);
            }
        };
        socket.on("thread", onThread);
        return () => {
            socket.off("thread", onThread);
        };
    }, [socket]);

    // Hàm gửi tin nhắn (không cập nhật state messages ở đây để tránh gửi đôi)
    const sendMessageHandler = (msgObj) => {
        if (!activeRoom) {
            showToast("Error", "Please select a chat first.", "error");
            return;
        }
        socket.emit("message", JSON.stringify(msgObj));
    };

    // Khi bấm vào chat từ danh sách, chuyển room, reset tin nhắn, và đặt unread = 0 cho room đó
    const handleRoomClick = (room) => {
        setActiveRoom(room);
        socket.emit("join", room);
        setMessages([]); // Reset tin nhắn cho room mới
        setActiveChats(prev => {
            const updated = { ...prev };
            if (updated[room]) {
                updated[room].unread = 0;
            }
            AsyncStorage.setItem('activeChats', JSON.stringify(updated))
                .catch(err => console.error("Error saving activeChats:", err));
            return updated;
        });
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
        if (window.confirm(`Are you sure you want to remove ${member}?`)) {
            socket.emit("removeGroupMember", { roomId, memberToRemove: member });
        }
    };

    const handleTransferGroupOwner = (roomId, newOwner) => {
        if (window.confirm(`Are you sure you want to transfer ownership to ${newOwner}?`)) {
            socket.emit("transferGroupOwner", { roomId, newOwner });
        }
    };

    const handleAssignDeputy = (roomId, member) => {
        if (window.confirm(`Assign deputy role to ${member}?`)) {
            socket.emit("assignDeputy", { roomId, member });
        }
    };

    const handleCancelDeputy = (roomId, member) => {
        if (window.confirm(`Cancel deputy role for ${member}?`)) {
            socket.emit("cancelDeputy", { roomId, member });
        }
    };

    const handleAddGroupMember = (newMember) => {
        if (newMember.trim() === "") {
            alert("Vui lòng nhập username của thành viên cần thêm");
            return;
        }
        socket.emit("addGroupMember", { roomId: activeRoom, newMember });
    };

    const handleLeaveGroup = () => {
        if (window.confirm("Bạn có chắc muốn rời khỏi nhóm này?")) {
            socket.emit("leaveGroup", { roomId: activeRoom });
            setGroupDetailsVisible(false);
            setActiveChats(prev => {
                const updated = { ...prev };
                delete updated[activeRoom];
                return updated;
            });
            setActiveRoom(null);
        }
    };

    const handleDisbandGroup = () => {
        if (window.confirm("Bạn có chắc muốn giải tán nhóm này?")) {
            socket.emit("disbandGroup", { roomId: activeRoom });
            setGroupDetailsVisible(false);
            setActiveChats(prev => {
                const updated = { ...prev };
                delete updated[activeRoom];
                return updated;
            });
            setActiveRoom(null);
        }
    };

    // Lắng nghe event "newGroupChat" để cập nhật chat list sau khi tạo nhóm
    useEffect(() => {
        if (!socket) return;
        const onNewGroupChat = (data) => {
            try {
                const groupChat = JSON.parse(data);
                setActiveChats(prev => {
                    const updated = {
                        ...prev,
                        [groupChat.roomId]: {
                            partner: groupChat.groupName,
                            unread: 0,
                            messages: [],
                            isGroup: true,
                        },
                    };
                    AsyncStorage.setItem('activeChats', JSON.stringify(updated))
                        .catch(err => console.error("Error saving activeChats:", err));
                    return updated;
                });
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
            alert("Vui lòng nhập tên nhóm");
            return;
        }
        if (selectedMembers.length === 0) {
            alert("Chọn ít nhất 1 thành viên");
            return;
        }
        socket.emit("createGroupChat", { groupName, members: selectedMembers });
        setGroupModalVisible(false);
        setGroupName("");
        setSelectedMembers([]);
    };

    // Hàm xử lý gửi lời mời kết bạn qua socket
    const handleAddFriend = (friendUsername) => {
        if (!username) return;
        socket.emit("addFriend", { myUsername: username, friendUsername });
        // Sau khi gửi, có thể ẩn modal nếu muốn
        setFriendModalVisible(false);
        setFriendInput("");
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
                            onPress={() => setFriendModalVisible(true)}
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

            {friendModalVisible && (
                <FriendModal
                    friendInput={friendInput}
                    setFriendInput={setFriendInput}
                    accounts={accounts}
                    myname={username}
                    friends={friends}
                    setFriendModalVisible={setFriendModalVisible}
                    handleAddFriend={handleAddFriend}
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
