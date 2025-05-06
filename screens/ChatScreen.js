import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Alert,
    Image,
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

// Thêm vào đầu file ChatScreen.js
const DefaultAvatar = "https://ui-avatars.com/api/?background=random&name=";
const GroupIcon = "👥"; // hoặc dùng image URL cho group icon

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

// Thêm vào ChatScreen.js
const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Nếu là today
    if (diff < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Nếu là tuần này
    if (diff < 7 * 24 * 60 * 60 * 1000) {
        return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    }
    
    // Còn lại hiện ngày tháng
    return date.toLocaleDateString();
};

const ChatScreen = () => {
    // State chat chính
    const [username, setUsername] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [friends, setFriends] = useState([]);
    const [requestedFriends, setRequestedFriends] = useState([]); // Danh sách lời mời đã gửi
    const [friendRequests, setFriendRequests] = useState([]); // Danh sách lời mời đến
    const [searchFilter, setSearchFilter] = useState('');
    const [filteredAccounts, setFilteredAccounts] = useState([]);
    const [activeChats, setActiveChats] = useState({
        // room_id: {
        //     partner: string,
        //     unread: number,
        //     isGroup: boolean,
        //     avatar: string,
        //     lastMessage: {
        //         text: string,
        //         time: string
        //     }
        // }
    });
    const [activeRoom, setActiveRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [activeEmotionMsgId, setActiveEmotionMsgId] = useState(null);

    // State cho Friend Modal
    const [friendModalVisible, setFriendModalVisible] = useState(false);
    const [friendInput, setFriendInput] = useState("");

    // State cho Group Chat
    const [groupModalVisible, setGroupModalVisible] = useState(false);
    const [groupDetailsVisible, setGroupDetailsVisible] = useState(false);
    const [groupInfo, setGroupInfo] = useState(null);
    const [groupName, setGroupName] = useState("");
    const [selectedMembers, setSelectedMembers] = useState([]);

    // Các ref hỗ trợ
    const joinedRoomsRef = useRef(new Set());
    const processedUnreadMessagesRef = useRef(new Set());
    const currentRoomRef = useRef(activeRoom);


    const excludedRoomsRef = useRef(new Set());


    useEffect(() => { currentRoomRef.current = activeRoom; }, [activeRoom]);

    // --- LOAD và SAVE activeChats từ AsyncStorage ---
    useEffect(() => {
        AsyncStorage.getItem('activeChats')
            .then(data => {
                if (data) {
                    setActiveChats(JSON.parse(data));
                }
            })
            .catch(err => console.error("Error loading activeChats:", err));
    }, []);
    // --- Refresh dữ liệu FriendModal mỗi lần mở modal ---
    useEffect(() => {
        if (friendModalVisible && username) {
            // Lấy lại danh sách bạn bè và lời mời
            socket.emit("getFriends", username);
            socket.emit("getSentFriendRequests", username);
            socket.emit("getFriendRequests", username);
            // Reset input tìm kiếm
            setFriendInput("");
        }
    }, [friendModalVisible, username]);
    useEffect(() => {
        AsyncStorage.setItem('activeChats', JSON.stringify(activeChats))
            .catch(err => console.error("Error saving activeChats:", err));
    }, [activeChats]);

    // Đăng ký username và lấy danh sách bạn
    useEffect(() => {
        const fetchAndRegisterUser = async () => {
            try {
                const userStr = await AsyncStorage.getItem('user');
                const stored = userStr ? JSON.parse(userStr) : {};
                const name = stored.username;
                if (name) {
                    setUsername(name);
                    socket.emit("registerUser", name);
                    socket.emit("getFriends", name);
                }
            } catch (error) {
                console.error("Lỗi khi xử lý username:", error);
            }
        };
        fetchAndRegisterUser();
    }, []);

    // Lắng nghe danh sách bạn từ server
    // Lắng nghe danh sách bạn từ server
    useEffect(() => {
        const onFriendsList = (friendsList) => {
            setFriends(friendsList);
        };
        // Realtime cập nhật khi server emit sau accept/cancel
        const onFriendsListUpdated = (updated) => {
            setFriends(updated);
        };

        socket.on("friendsList", onFriendsList);
        socket.on("friendsListUpdated", onFriendsListUpdated);

        return () => {
            socket.off("friendsList", onFriendsList);
            socket.off("friendsListUpdated", onFriendsListUpdated);
        };
    }, []);

    // Lắng nghe kết quả gửi lời mời kết bạn
    useEffect(() => {
        const onAddFriendResult = (data) => {
            showToast("Kết bạn", data.message, data.success ? "success" : "error");
        };
        socket.on("addFriendResult", onAddFriendResult);
        return () => {
            socket.off("addFriendResult", onAddFriendResult);
        };
    }, []);

    // Lắng nghe event friendAccepted: cập nhật activeChats khi kết bạn thành công
    useEffect(() => {
        const onFriendAccepted = ({ friend, roomId }) => {
            setActiveChats(prev => {
                const updated = { ...prev };
                if (!updated[roomId]) {
                    updated[roomId] = { partner: friend, unread: 0, isGroup: false };
                }
                AsyncStorage.setItem('activeChats', JSON.stringify(updated))
                    .catch(err => console.error("Error saving activeChats:", err));
                return updated;
            });
            socket.emit("join", roomId);
            joinedRoomsRef.current.add(roomId);
            showToast("Kết bạn", `Bạn đã kết bạn với ${friend}`, "success");
        };
        socket.on("friendAccepted", onFriendAccepted);
        return () => {
            socket.off("friendAccepted", onFriendAccepted);
        };
    }, []);

    // Lắng nghe event mới về lời mời kết bạn (nhận)
    useEffect(() => {
        const onNewFriendRequest = (data) => {
            showToast("Lời mời kết bạn", `Bạn có lời mời kết bạn từ ${data.from}`, "info");
            setFriendRequests(prev => [...prev, data.from]);
        };
        socket.on("newFriendRequest", onNewFriendRequest);
        return () => {
            socket.off("newFriendRequest", onNewFriendRequest);
        };
    }, []);

    // Lắng nghe danh sách lời mời từ server
    useEffect(() => {
        const onFriendRequests = (requests) => {
            // Giả sử từ server trả về mảng objects có thuộc tính "from"
            setFriendRequests(requests.map(req => req.from));
        };
        socket.on("friendRequests", onFriendRequests);
        return () => {
            socket.off("friendRequests", onFriendRequests);
        };
    }, []);

    // Lắng nghe event về lời mời đã gửi (cho người gửi)
    useEffect(() => {
        const onSentFriendRequests = (requests) => {
            const sentRequests = requests.map(req => req.to);
            setRequestedFriends(sentRequests);
        };
        socket.on('sentFriendRequests', onSentFriendRequests);
        return () => {
            socket.off('sentFriendRequests', onSentFriendRequests);
        };
    }, []);

    useEffect(() => {
        const onFriendRequestSent = ({ to }) => {
            setRequestedFriends(prev =>
                prev.includes(to) ? prev : [...prev, to]
            );
        };
        socket.on('friendRequestSent', onFriendRequestSent);
        return () => {
            socket.off('friendRequestSent', onFriendRequestSent);
        };
    }, []);

    // Lắng nghe event thu hồi lời mời kết bạn
    useEffect(() => {
        const onFriendRequestWithdrawn = ({ from, to }) => {
            // Nếu người gửi là mình thì remove từ requestedFriends,
            // nếu là người nhận thì remove từ friendRequests.
            if (from === username) {
                setRequestedFriends(prev => prev.filter(u => u !== to));
            } else if (to === username) {
                setFriendRequests(prev => prev.filter(u => u !== from));
            }
        };
        const onRespondResult = (data) => {
            showToast("Friend Request", data.message, data.success ? "success" : "info");
            // refresh cả 2
            socket.emit("getFriendRequests", username);
            socket.emit("getFriends", username);
        };
        socket.on('friendRequestWithdrawn', onFriendRequestWithdrawn);
        socket.on("respondFriendRequestResult", onRespondResult);

        return () => {
            socket.off('friendRequestWithdrawn', onFriendRequestWithdrawn);
            socket.off("respondFriendRequestResult", onRespondResult);
        };
    }, [username]);

    // Lắng nghe event groupDetailsResult để cập nhật thông tin nhóm realtime
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
    }, []);

    // Nếu modal group details đang mở, refresh nếu có cập nhật nhóm
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
    }, [groupDetailsVisible, activeRoom]);

    // Lấy danh sách tài khoản (cho tìm kiếm và kết bạn)
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

    // Lắng nghe cuộc trò chuyện (userConversations) và join room tự động
    useEffect(() => {
        if (!socket || !username) return;

        const onAddedToGroup = (data) => {
            try {
                const groupData = typeof data === 'string' ? JSON.parse(data) : data;
                if (!groupData.roomId || !groupData.group?.groupName) {
                    console.error("Invalid group data received:", groupData);
                    return;
                }

                // Xóa khỏi danh sách excluded nếu có
                if (excludedRoomsRef.current.has(groupData.roomId)) {
                    excludedRoomsRef.current.delete(groupData.roomId);
                }

                // Cập nhật activeChats
                setActiveChats(prev => {
                    const newChats = {
                        ...prev,
                        [groupData.roomId]: {
                            partner: groupData.group.groupName,
                            unread: 0,
                            messages: [],
                            isGroup: true
                        }
                    };

                    // Cập nhật AsyncStorage
                    AsyncStorage.setItem('activeChats', JSON.stringify(newChats))
                        .catch(err => console.error("Error saving activeChats:", err));

                    return newChats;
                });

                // Auto join room mới
                if (!joinedRoomsRef.current.has(groupData.roomId)) {
                    socket.emit("join", groupData.roomId);
                    joinedRoomsRef.current.add(groupData.roomId);
                }

                // Lấy lại toàn bộ conversations để đảm bảo dữ liệu đồng bộ
                socket.emit("getUserConversations", username);

                showToast("Thông báo", groupData.message || `Bạn đã được thêm vào nhóm ${groupData.group.groupName}`, "info");
            } catch (error) {
                console.error("Error handling added to group:", error);
            }
        };

        const onGroupUpdated = () => {
            // Refresh lại danh sách conversations khi có cập nhật về group
            socket.emit("getUserConversations", username);
        };

        socket.on("addedToGroup", onAddedToGroup);
        socket.on("groupUpdated", onGroupUpdated);

        return () => {
            socket.off("addedToGroup", onAddedToGroup);
            socket.off("groupUpdated", onGroupUpdated);
        };
    }, [socket, username]);

    // Tách riêng phần lắng nghe userConversations
    useEffect(() => {
        if (!socket || !username) return;

        const onUserConversations = (data) => {
            try {
                const conversationData = JSON.parse(data);
                let chatsFromServer = {};

                // Xử lý private chats
                if (conversationData.privateChats) {
                    conversationData.privateChats.forEach(chat => {
                        if (!excludedRoomsRef.current.has(chat.roomId)) {
                            const lastMsg = chat.messages[chat.messages.length - 1];
                            chatsFromServer[chat.roomId] = {
                                partner: chat.friend,
                                unread: 0,
                                isGroup: false,
                                avatar: null,
                                lastMessage: lastMsg ? {
                                    text: `${lastMsg.name === username ? 'Bạn' : lastMsg.name}: ${lastMsg.message || 'Đã gửi một tệp đính kèm'}`,
                                    time: lastMsg.createdAt
                                } : null
                            };

                            // Auto join room
                            if (!joinedRoomsRef.current.has(chat.roomId)) {
                                socket.emit("join", chat.roomId);
                                joinedRoomsRef.current.add(chat.roomId);
                            }
                        }
                    });
                }

                // Xử lý group chats tương tự
                if (conversationData.groupChats) {
                    conversationData.groupChats.forEach(chat => {
                        if (!excludedRoomsRef.current.has(chat.roomId)) {
                            const lastMsg = chat.messages[chat.messages.length - 1];
                            chatsFromServer[chat.roomId] = {
                                partner: chat.groupName,
                                unread: 0,
                                isGroup: true,
                                lastMessage: lastMsg ? {
                                    text: `${lastMsg.name === username ? 'Bạn' : lastMsg.name}: ${lastMsg.message || 'Đã gửi một tệp đính kèm'}`,
                                    time: lastMsg.createdAt
                                } : null
                            };

                            // Auto join room
                            if (!joinedRoomsRef.current.has(chat.roomId)) {
                                socket.emit("join", chat.roomId);
                                joinedRoomsRef.current.add(chat.roomId);
                            }
                        }
                    });
                }

                setActiveChats(prevChats => {
                    const mergedChats = { ...chatsFromServer };
                    // Giữ lại unread count từ prevChats
                    Object.keys(prevChats).forEach(room => {
                        if (mergedChats[room] && prevChats[room].unread > 0) {
                            mergedChats[room].unread = prevChats[room].unread;
                        }
                    });
                    return mergedChats;
                });
            } catch (error) {
                console.error("Error parsing userConversations:", error);
            }
        };

        socket.on("userConversations", onUserConversations);
        socket.emit("getUserConversations", username);

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
    }, [activeRoom]);

    // Lắng nghe event "reactionHistory" để load reactions
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
    }, [activeRoom]);

    // Lắng nghe event "emotion" để cập nhật reaction realtime
    useEffect(() => {
        if (!socket) return;
        const onEmotion = (data) => {
            try {
                const reactionObj = JSON.parse(data);
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
    }, []);

    // Lắng nghe event "thread" để nhận tin nhắn mới realtime (bao gồm group chat)
    useEffect(() => {
        if (!socket) return;
        const onThread = (data) => {
            try {
                const newMsg = JSON.parse(data);
                setMessages(prev => {
                    if (prev.find(msg => getMessageId(msg) === getMessageId(newMsg))) {
                        return prev;
                    }
                    return [...prev, newMsg];
                });

                // Cập nhật tin nhắn cuối trong activeChats
                setActiveChats(prev => {
                    const updated = { ...prev };
                    if (updated[newMsg.room]) {
                        // Cập nhật last message
                        updated[newMsg.room].lastMessage = {
                            text: `${newMsg.name === username ? 'Bạn' : newMsg.name}: ${newMsg.message || 'Đã gửi một tệp đính kèm'}`,
                            time: new Date().toISOString()
                        };

                        // Cập nhật unread nếu không phải room hiện tại
                        if (newMsg.room !== currentRoomRef.current) {
                            updated[newMsg.room].unread = (updated[newMsg.room].unread || 0) + 0.5;
                        }
                    }

                    AsyncStorage.setItem('activeChats', JSON.stringify(updated))
                        .catch(err => console.error("Error saving activeChats:", err));
                    return updated;
                });
            } catch (error) {
                console.error("Error parsing thread:", error);
            }
        };
        socket.on("thread", onThread);
        return () => socket.off("thread", onThread);
    }, [socket, username]);

    // Thêm useEffect mới để lắng nghe tin nhắn mới
    useEffect(() => {
        if (!socket || !username) return;

        const onNewMessage = (data) => {
            try {
                const newMsg = JSON.parse(data);
                
                // Cập nhật activeChats ngay khi có tin nhắn mới
                setActiveChats(prev => {
                    const updated = { ...prev };
                    const roomId = newMsg.room;

                    if (updated[roomId]) {
                        updated[roomId] = {
                            ...updated[roomId],
                            lastMessage: {
                                text: `${newMsg.name === username ? 'Bạn' : newMsg.name}: ${newMsg.message || 'Đã gửi một tệp đính kèm'}`,
                                time: new Date().toISOString()
                            },
                            // Tăng unread nếu không phải room hiện tại
                            unread: roomId !== currentRoomRef.current 
                                ? (updated[roomId].unread || 0) + 0.5 
                                : 0
                        };

                        // Lưu vào AsyncStorage
                        AsyncStorage.setItem('activeChats', JSON.stringify(updated))
                            .catch(err => console.error("Error saving activeChats:", err));
                    }
                    return updated;
                });

                // Cập nhật messages nếu đang ở trong room đó
                if (newMsg.room === currentRoomRef.current) {
                    setMessages(prev => {
                        if (prev.find(msg => getMessageId(msg) === getMessageId(newMsg))) {
                            return prev;
                        }
                        return [...prev, newMsg];
                    });
                }
            } catch (error) {
                console.error("Error handling new message:", error);
            }
        };

        socket.on("thread", onNewMessage);
        
        return () => {
            socket.off("thread", onNewMessage);
        };
    }, [socket, username]);

    // Hàm gửi tin nhắn
    const sendMessageHandler = (msgObj) => {
        if (!activeRoom) {
            showToast("Error", "Please select a chat first.", "error");
            return;
        }
        socket.emit("message", JSON.stringify(msgObj));
    };

    // Khi chọn chat từ danh sách: chuyển room, reset tin nhắn, đặt unread = 0
    const handleRoomClick = (room) => {
        setActiveRoom(room);
        socket.emit("join", room);
        setMessages([]); // Reset tin nhắn khi chuyển room
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

    // Khi chọn user từ kết quả tìm kiếm, khởi tạo room cá nhân
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
        socket.emit("emotion", JSON.stringify(reactionData));
        setMessages(prev =>
            prev.map(msg =>
                getMessageId(msg).toString() === msgId.toString()
                    ? { ...msg, reaction: emotionId }
                    : msg
            )
        );
    };

    // ----- Các hàm quản lý Group Chat -----

    const handleRemoveGroupMember = (roomId, member) => {
        socket.emit("removeGroupMember", { roomId, memberToRemove: member });
        showToast("Thông báo", `Đã xóa ${member} khỏi nhóm`, "info");
    };

    const handleTransferGroupOwner = (roomId, newOwner) => {
        socket.emit("transferGroupOwner", { roomId, newOwner });
        showToast("Thông báo", `Đã chuyển quyền quản trị cho ${newOwner}`, "info");
    };

    const handleAssignDeputy = (roomId, member) => {
        socket.emit("assignDeputy", { roomId, member });
        showToast("Thông báo", `Đã bổ nhiệm ${member} làm phó nhóm`, "info");
    };

    const handleCancelDeputy = (roomId, member) => {
        socket.emit("cancelDeputy", { roomId, member });
        showToast("Thông báo", `Đã bãi nhiệm ${member} khỏi vị trí phó nhóm`, "info");
    };

    const handleAddGroupMember = (newMember) => {
        if (newMember.trim() === "") {
            showToast("Lỗi", "Vui lòng nhập username của thành viên cần thêm", "error");
            return;
        }
        socket.emit("addGroupMember", { roomId: activeRoom, newMember });
        showToast("Thông báo", `Đã thêm ${newMember} vào nhóm`, "info");
    };

    // Hàm reset toàn bộ state sau khi rời/giải tán nhóm
    const removeRoomFromChat = (roomIdToRemove) => {
        // Đánh dấu đã xóa
        excludedRoomsRef.current.add(roomIdToRemove);

        // Reset activeRoom ngay lập tức nếu đang ở trong room đó
        if (activeRoom === roomIdToRemove) {
            setActiveRoom(null);
        }

        // Cập nhật state và AsyncStorage
        setActiveChats(prev => {
            const newChats = { ...prev };
            delete newChats[roomIdToRemove];

            // Cập nhật AsyncStorage
            AsyncStorage.setItem('activeChats', JSON.stringify(newChats))
                .catch(err => console.error("Error saving activeChats:", err));

            return newChats;
        });

        // Reset group details
        setGroupDetailsVisible(false);
        setGroupInfo(null);
    };

    // Rời nhóm
    const handleLeaveGroup = (newOwner) => {
        const isOwner = groupInfo?.owner === username;
        const roomId = activeRoom;
        if (isOwner && !newOwner) {
            showToast("Lỗi", "Bạn phải chọn người nhận quyền trước khi rời nhóm", "error");
            return;
        }

        socket.emit("leaveGroup", { roomId: activeRoom, ...(isOwner ? { newOwner } : {}) });
        showToast("Thông báo", "Bạn đã rời khỏi nhóm", "info");
        removeRoomFromChat(activeRoom);
    };

    // Giải tán nhóm
    const handleDisbandGroup = () => {
        socket.emit("disbandGroup", { roomId: activeRoom });
        showToast("Thông báo", "Nhóm đã được giải tán", "info");
        removeRoomFromChat(activeRoom);
    };

    // Thêm useEffect mới để lắng nghe các sự kiện liên quan đến group
    useEffect(() => {
        if (!socket) return;

        const onGroupLeft = (data) => {
            try {
                const { roomId, username: leftUser } = typeof data === 'string' ? JSON.parse(data) : data;

                // Nếu người rời nhóm là mình
                if (leftUser === username) {
                    removeRoomFromChat(roomId);
                    showToast("Success", "Bạn đã rời nhóm thành công", "success");
                } else {
                    // Nếu người khác rời nhóm, cập nhật lại thông tin nhóm
                    if (activeRoom === roomId) {
                        socket.emit("getGroupDetails", { roomId });
                    }
                }
            } catch (error) {
                console.error("Error handling group left:", error);
            }
        };

        const onGroupDisbanded = (data) => {
            try {
                const { roomId } = typeof data === 'string' ? JSON.parse(data) : data;
                removeRoomFromChat(roomId);
                showToast("Success", "Nhóm đã được giải tán", "success");
            } catch (error) {
                console.error("Error handling group disbanded:", error);
            }
        };

        socket.on("groupLeft", onGroupLeft);
        socket.on("groupDisbanded", onGroupDisbanded);

        return () => {
            socket.off("groupLeft", onGroupLeft);
            socket.off("groupDisbanded", onGroupDisbanded);
        };
    }, [socket, username, activeRoom]);

    // Lắng nghe event "newGroupChat" để cập nhật activeChats khi tạo nhóm mới
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
                showToast("Nhóm Chat", `Nhóm chat mới đã được tạo: ${groupChat.groupName}`, "success");
            } catch (error) {
                console.error("Error parsing newGroupChat:", error);
            }
        };
        socket.on("newGroupChat", onNewGroupChat);
        return () => {
            socket.off("newGroupChat", onNewGroupChat);
        };
    }, []);

    // Hàm tạo nhóm chat
    const handleCreateGroup = () => {
        if (!groupName) {
            showToast("Lỗi", "Vui lòng nhập tên nhóm", "error");
            return;
        }
        if (selectedMembers.length === 0) {
            showToast("Lỗi", "Chọn ít nhất 1 thành viên", "error");
            return;
        }
        socket.emit("createGroupChat", { groupName, members: selectedMembers });
        setGroupModalVisible(false);
        setGroupName("");
        setSelectedMembers([]);
    };

    // Hàm gửi lời mời kết bạn
    const handleAddFriend = (friendUsername) => {
        if (!username) return;
        socket.emit("addFriend", { myUsername: username, friendUsername });
        setFriendInput("");
        // cập nhật đúng user vừa gửi
        setRequestedFriends(prev => [...prev, friendUsername]);
        // (nếu bạn muốn modal vẫn mở để xem tab "Đã gửi", có thể bỏ setFriendModalVisible)
        setFriendModalVisible(false);
    };

    // Hàm thu hồi lời mời kết bạn (nếu muốn)
    const handleWithdrawFriendRequest = (friendUsername) => {
        socket.emit("withdrawFriendRequest", { myUsername: username, friendUsername });
    };

    // Hàm xử lý phản hồi lời mời (chấp nhận/từ chối)
    const handleRespondToFriendRequest = (fromUsername, accept) => {
        socket.emit("respondFriendRequest", {
            requestId: fromUsername, // hoặc đúng ID của req
            action: accept ? "accepted" : "rejected"
        });
        setFriendRequests(prev => prev.filter(user => user !== fromUsername));
        if (accept) {
            showToast("Kết bạn", `Đã chấp nhận lời mời từ ${fromUsername}`, "success");
        } else {
            showToast("Kết bạn", `Đã từ chối lời mời từ ${fromUsername}`, "info");
        }
    };

    const chatList = Object.keys(activeChats).map(room => ({ room, ...activeChats[room] }));
    const isSearching = searchFilter.trim().length > 0;

    // Nếu đang chọn một chat, chuyển sang ChatContainer
    if (activeRoom) {
        return (
            <ChatContainer
                currentRoom={activeRoom}
                messages={messages}
                myname={username}
                sendMessage={sendMessageHandler}
                message={message}
                setMessage={setMessage}
                handleDeleteMessage={(msgId, room) => showToast("Delete", `Delete message ${msgId}`, "info")}
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
                groupDetailsVisible={groupDetailsVisible}
                groupInfo={groupInfo}
                handleRemoveGroupMember={handleRemoveGroupMember}
                handleTransferGroupOwner={handleTransferGroupOwner}
                handleAssignDeputy={handleAssignDeputy}
                handleCancelDeputy={handleCancelDeputy}
                handleAddGroupMember={handleAddGroupMember}
                handleLeaveGroup={(selectedNewOwner) => handleLeaveGroup(selectedNewOwner)}
                handleDisbandGroup={handleDisbandGroup}
                setGroupDetailsVisible={setGroupDetailsVisible}
                allUsers={accounts.map(acc => acc.username)}
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
                    <TouchableOpacity style={styles.button} onPress={() => setFriendModalVisible(true)}>
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
                            <Text style={styles.addButtonText}> </Text>
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
                                    style={[styles.chatItem]}
                                    onPress={() => handleRoomClick(item.room)}
                                >
                                    <View style={styles.avatarContainer}>
                                        {item.isGroup ? (
                                            <Text style={styles.groupIcon}>{GroupIcon}</Text>
                                        ) : (
                                            <Image 
                                                source={{ 
                                                    uri: item.avatar || `${DefaultAvatar}${item.partner}`
                                                }}
                                                style={styles.avatar}
                                            />
                                        )}
                                    </View>
                                    
                                    <View style={styles.chatInfo}>
                                        <View style={styles.chatHeader}>
                                            <Text style={styles.chatName}>
                                                {item.isGroup ? `${item.partner}` : item.partner}
                                            </Text>
                                            <Text style={styles.lastMessageTime}>
                                                {formatTime(item.lastMessage?.time)}
                                            </Text>
                                        </View>
                                        
                                        <View style={styles.lastMessageContainer}>
                                            <Text 
                                                numberOfLines={1} 
                                                style={[
                                                    styles.lastMessageText,
                                                    item.unread > 0 && styles.unreadMessage
                                                ]}
                                            >
                                                {item.lastMessage?.text || 'Chưa có tin nhắn'}
                                            </Text>
                                            {item.unread > 0 && (
                                                <View style={styles.unreadBadge}>
                                                    <Text style={styles.unreadText}>{item.unread}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
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
                    socket={socket}
                    myname={username}
                    accounts={accounts}
                    friendInput={friendInput}
                    setFriendInput={setFriendInput}
                    friends={friends}
                    requestedFriends={requestedFriends}
                    setRequestedFriends={setRequestedFriends}
                    friendRequests={friendRequests}
                    setFriendRequests={setFriendRequests}
                    handleAddFriend={handleAddFriend}
                    handleWithdrawFriendRequest={handleWithdrawFriendRequest}
                    setFriendModalVisible={setFriendModalVisible}
                    handleRespondToFriendRequest={handleRespondToFriendRequest}
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
    chatItem: {
        flexDirection: 'row',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        alignItems: 'center',
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    groupIcon: {
        fontSize: 35,
        width: 50,
        height: 50,
        textAlign: 'center',
        lineHeight: 50,
        backgroundColor: '#e1e1e1',
        borderRadius: 25,
    },
    chatInfo: {
        flex: 1,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    chatName: {
        fontSize: 16,
        fontWeight: '600',
    },
    lastMessageTime: {
        fontSize: 12,
        color: '#666',
    },
    lastMessageContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessageText: {
        fontSize: 14,
        color: '#666',
        flex: 1,
        marginRight: 8,
    },
    unreadMessage: {
        fontWeight: '600',
        color: '#000',
    },
    unreadBadge: {
        backgroundColor: '#007AFF',
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    noChatsContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
    noChatsText: { fontSize: 16, color: "#888" },
});