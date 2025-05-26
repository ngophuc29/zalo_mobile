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
    Modal,
    ScrollView,
} from 'react-native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import ChatContainer from './ChatContainer';
import FriendModal from './FriendModal';
import GroupChatModal from './GroupChatModal';
import { FontSizes } from '../utils/fontScaling';
import { CheckBox } from 'react-native';
import { MdGroupAdd } from "react-icons/md";
import { useFocusEffect } from '@react-navigation/native';

const socket = io("http://localhost:5000");

const emotions = [
    { id: 1, icon: "❤️" },
    { id: 2, icon: "😊" },
    { id: 3, icon: "😮" },
    { id: 4, icon: "😒" },
    { id: 5, icon: "😡" },
];

const DefaultAvatar = "https://ui-avatars.com/api/?background=random&name=";
const GroupIcon = "👥";

const getUserAvatarUrl = (username, accounts = [], avatar = null) => {
    if (avatar) return avatar;

    const userAccount = accounts.find(acc => acc.username === username);
    if (userAccount?.image) return userAccount.image;

    return `${DefaultAvatar}${username}`;
};

const getMessageId = (msg) => {
    if (msg._id) return msg._id.toString();
    if (msg.id) return msg.id.toString();
    return null;
};

const showToast = (title, message, type = 'info') => {
    Toast.show({
        type,
        text1: title,
        text2: message,
        position: 'top',
        visibilityTime: 3000,
    });
};

const formatTime = (timestamp) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (diff < 7 * 24 * 60 * 60 * 1000) {
        return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    }

    return date.toLocaleDateString();
};

const ChatScreen = () => {
    const [username, setUsername] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [friends, setFriends] = useState([]);
    const [requestedFriends, setRequestedFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [searchFilter, setSearchFilter] = useState('');
    const [filteredAccounts, setFilteredAccounts] = useState([]);
    const [activeChats, setActiveChats] = useState({});
    const [activeRoom, setActiveRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [activeEmotionMsgId, setActiveEmotionMsgId] = useState(null);

    const [friendModalVisible, setFriendModalVisible] = useState(false);
    const [friendInput, setFriendInput] = useState("");

    const [groupModalVisible, setGroupModalVisible] = useState(false);
    const [groupDetailsVisible, setGroupDetailsVisible] = useState(false);
    const [groupInfo, setGroupInfo] = useState(null);
    const [groupName, setGroupName] = useState("");
    const [selectedMembers, setSelectedMembers] = useState([]);

    const joinedRoomsRef = useRef(new Set());
    const processedUnreadMessagesRef = useRef(new Set());
    const currentRoomRef = useRef(activeRoom);

    const excludedRoomsRef = useRef(new Set());

    const [forwardModalVisible, setForwardModalVisible] = useState(false);
    const [forwardMessageObj, setForwardMessageObj] = useState(null);
    const [selectedForwardRooms, setSelectedForwardRooms] = useState([]);

    const [isSearching, setIsSearching] = useState(false);
    const [forceUpdate, setForceUpdate] = useState(0);

    useEffect(() => { currentRoomRef.current = activeRoom; }, [activeRoom]);

    useEffect(() => {
        AsyncStorage.getItem('activeChats')
            .then(data => {
                if (data) {
                    setActiveChats(JSON.parse(data));
                }
            })
            .catch(err => console.error("Error loading activeChats:", err));
    }, []);

    useEffect(() => {
        if (friendModalVisible && username) {
            socket.emit("getFriends", username);
            socket.emit("getSentFriendRequests", username);
            socket.emit("getFriendRequests", username);
            setFriendInput("");
        }
    }, [friendModalVisible, username]);

    useEffect(() => {
        AsyncStorage.setItem('activeChats', JSON.stringify(activeChats))
            .catch(err => console.error("Error saving activeChats:", err));
    }, [activeChats]);

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

    useEffect(() => {
        if (!socket || !username) return;
        // Khi danh sách bạn bè thay đổi, đồng bộ lại requestedFriends
        const onFriendsList = (friendsList) => {
            setFriends(friendsList);
            socket.emit('getSentFriendRequests', username);
        };
        socket.on('friendsList', onFriendsList);
        return () => {
            socket.off('friendsList', onFriendsList);
        };
    }, [socket, username]);

    useEffect(() => {
        if (!socket || !username) return;
        // Khi bị hủy kết bạn, đồng bộ lại friends, friendRequests, requestedFriends
        const onFriendRemoved = (data) => {
            // Xác định partnerName nếu đang ở phòng chat cá nhân
            let partnerName = null;
            if (activeRoom && activeRoom.includes('-')) {
                const parts = activeRoom.split('-');
                partnerName = parts.find(name => name !== username);
            }
            if (partnerName) {
                setRequestedFriends(prev => prev.filter(u => u !== partnerName));
            }
            socket.emit('getFriends', username);
            socket.emit('getFriendRequests', username);
            socket.emit('getSentFriendRequests', username);
            setForceUpdate(Date.now()); // Force re-render để cập nhật UI
        };
        socket.on('friendRemoved', onFriendRemoved);
        return () => {
            socket.off('friendRemoved', onFriendRemoved);
        };
    }, [socket, username, activeRoom]);

    useEffect(() => {
        const onFriendsList = (friendsList) => {
            setFriends(friendsList);
        };
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

    useEffect(() => {
        const onAddFriendResult = (data) => {
            showToast("Kết bạn", data.message, data.success ? "success" : "error");
        };
        socket.on("addFriendResult", onAddFriendResult);
        return () => {
            socket.off("addFriendResult", onAddFriendResult);
        };
    }, []);

    useEffect(() => {
        if (!socket || !username) return;
        const onFriendAccepted = ({ friend, roomId }) => {
            setActiveChats(prev => {
                const updated = { ...prev };
                if (!updated[roomId]) {
                    updated[roomId] = { partner: friend, unread: 0, isGroup: false };
                }
                AsyncStorage.setItem('activeChats', JSON.stringify(updated)).catch(err => console.error("Error saving activeChats:", err));
                return updated;
            });
            // Luôn đồng bộ lại friends, requestedFriends, friendRequests cho cả 2 phía
            socket.emit("getFriends", username);
            socket.emit("getFriendRequests", username);
            socket.emit("getSentFriendRequests", username);
            // Đồng bộ lại toàn bộ chat list như web
            socket.emit("getUserConversations", username);
            // Nếu mình là người gửi hoặc nhận, join room và chuyển phòng
            if (roomId && (roomId.includes(username) || friend === username)) {
                socket.emit("join", roomId);
                joinedRoomsRef.current.add(roomId);
                setActiveRoom(roomId);
                AsyncStorage.setItem('activeRoom', roomId).catch(() => {});
            }
            setRequestedFriends(prev => prev.filter(u => u !== friend));
            showToast("Kết bạn", `Bạn đã kết bạn với ${friend} `, "success");
        };
        socket.on("friendAccepted", onFriendAccepted);
        return () => {
            socket.off("friendAccepted", onFriendAccepted);
        };
    }, [socket, username]);

    useEffect(() => {
        const onNewFriendRequest = (data) => {
            showToast("Lời mời kết bạn", `Bạn có lời mời kết bạn từ ${data.from}`, "info");
            // Cập nhật lại danh sách lời mời kết bạn ngay lập tức
            socket.emit("getFriendRequests", username);
        };
        socket.on("newFriendRequest", onNewFriendRequest);
        return () => {
            socket.off("newFriendRequest", onNewFriendRequest);
        };
    }, [username]);

    useEffect(() => {
        const onFriendRequests = (requests) => {
            setFriendRequests(requests); // giữ nguyên object {from, to}
        };
        socket.on("friendRequests", onFriendRequests);
        return () => {
            socket.off("friendRequests", onFriendRequests);
        };
    }, []);

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

    useEffect(() => {
        const onFriendRequestWithdrawn = ({ from, to }) => {
            if (from === username) {
                setRequestedFriends(prev => prev.filter(u => u !== to));
            } else if (to === username) {
                setFriendRequests(prev => prev.filter(u => u !== from));
            }
        };
        const onRespondResult = (data) => {
            // Nếu mình là người gửi và bị từ chối thì xóa khỏi requestedFriends
            if (data.action === 'rejected' && data.from && data.to && data.from === username) {
                setRequestedFriends(prev => prev.filter(u => u !== data.to));
            }
            showToast("Friend Request", data.message, data.success ? "success" : "info");
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

    useEffect(() => {
        fetch("http://localhost:5000/api/accounts")
            .then(res => res.json())
            .then(data => setAccounts(data))
            .catch(err => console.error("Error fetching accounts:", err));
    }, []);

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

    useEffect(() => {
        if (!socket || !username) return;

        const onAddedToGroup = (data) => {
            try {
                const groupData = typeof data === 'string' ? JSON.parse(data) : data;
                if (!groupData.roomId || !groupData.group?.groupName) {
                    console.error("Invalid group data received:", groupData);
                    return;
                }

                if (excludedRoomsRef.current.has(groupData.roomId)) {
                    excludedRoomsRef.current.delete(groupData.roomId);
                }

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

                    AsyncStorage.setItem('activeChats', JSON.stringify(newChats))
                        .catch(err => console.error("Error saving activeChats:", err));

                    return newChats;
                });

                if (!joinedRoomsRef.current.has(groupData.roomId)) {
                    socket.emit("join", groupData.roomId);
                    joinedRoomsRef.current.add(groupData.roomId);
                }

                socket.emit("getUserConversations", username);

                showToast("Thông báo", groupData.message || `Bạn đã được thêm vào nhóm ${groupData.group.groupName}`, "info");
            } catch (error) {
                console.error("Error handling added to group:", error);
            }
        };

        const onGroupUpdated = () => {
            socket.emit("getUserConversations", username);
        };

        socket.on("addedToGroup", onAddedToGroup);
        socket.on("groupUpdated", onGroupUpdated);

        return () => {
            socket.off("addedToGroup", onAddedToGroup);
            socket.off("groupUpdated", onGroupUpdated);
        };
    }, [socket, username]);

    useEffect(() => {
        if (!socket || !username) return;

        const onUserConversations = (data) => {
            try {
                const conversationData = JSON.parse(data);
                let chatsFromServer = {};

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

                            if (!joinedRoomsRef.current.has(chat.roomId)) {
                                socket.emit("join", chat.roomId);
                                joinedRoomsRef.current.add(chat.roomId);
                            }
                        }
                    });
                }

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

                            if (!joinedRoomsRef.current.has(chat.roomId)) {
                                socket.emit("join", chat.roomId);
                                joinedRoomsRef.current.add(chat.roomId);
                            }
                        }
                    });
                }

                setActiveChats(prevChats => {
                    const mergedChats = { ...chatsFromServer };
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

    useEffect(() => {
        if (!socket) return;
        const onThread = (data) => {
            try {
                const newMsg = JSON.parse(data);
                if (newMsg.room === currentRoomRef.current) {
                    setMessages(prev => {
                        if (prev.find(msg => getMessageId(msg) === getMessageId(newMsg))) {
                            return prev;
                        }
                        return [...prev, newMsg];
                    });
                }
                setActiveChats(prev => {
                    const updated = { ...prev };
                    if (updated[newMsg.room]) {
                        updated[newMsg.room].lastMessage = {
                            text: `${newMsg.name === username ? 'Bạn' : newMsg.name}: ${newMsg.message || 'Đã gửi một tệp đính kèm'}`,
                            time: new Date().toISOString()
                        };
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

    useEffect(() => {
        if (!socket || !username) return;

        const onNewMessage = (data) => {
            try {
                const newMsg = JSON.parse(data);

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
                            unread: roomId !== currentRoomRef.current
                                ? (updated[roomId].unread || 0) + 0.5
                                : 0
                        };

                        AsyncStorage.setItem('activeChats', JSON.stringify(updated))
                            .catch(err => console.error("Error saving activeChats:", err));
                    }
                    return updated;
                });

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

    const sendMessageHandler = (msgObj) => {
        if (!activeRoom) {
            showToast("Error", "Please select a chat first.", "error");
            return;
        }
        socket.emit("message", JSON.stringify(msgObj));
    };

    const handleRoomClick = (room) => {
        setActiveRoom(room);
        socket.emit("join", room);
        setMessages([]);
        // Đồng bộ lại trạng thái bạn bè và lời mời khi vào room
        socket.emit("getFriends", username);
        socket.emit("getFriendRequests", username);
        socket.emit("getSentFriendRequests", username);
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

    const handleUserClick = (targetUser) => {
        if (targetUser === username) return;
        const room = [username, targetUser].sort().join("-");
        setActiveRoom(room);
        socket.emit("join", room);
        setMessages([]);
        socket.emit("getSentFriendRequests", username); // Đồng bộ lại requestedFriends khi vào room
        setActiveChats(prev => ({
            ...prev,
            [room]: { partner: targetUser, unread: 0, messages: [] },
        }));
    };

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

    const removeRoomFromChat = (roomIdToRemove) => {
        excludedRoomsRef.current.add(roomIdToRemove);

        if (activeRoom === roomIdToRemove) {
            setActiveRoom(null);
        }

        setActiveChats(prev => {
            const newChats = { ...prev };
            delete newChats[roomIdToRemove];

            AsyncStorage.setItem('activeChats', JSON.stringify(newChats))
                .catch(err => console.error("Error saving activeChats:", err));

            return newChats;
        });

        setGroupDetailsVisible(false);
        setGroupInfo(null);
    };

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

    const handleDisbandGroup = () => {
        socket.emit("disbandGroup", { roomId: activeRoom });
        showToast("Thông báo", "Nhóm đã được giải tán", "info");
        removeRoomFromChat(activeRoom);
    };

    useEffect(() => {
        if (!socket) return;

        const onGroupLeft = (data) => {
            try {
                const { roomId, username: leftUser } = typeof data === 'string' ? JSON.parse(data) : data;

                if (leftUser === username) {
                    removeRoomFromChat(roomId);
                    showToast("Success", "Bạn đã rời nhóm thành công", "success");
                } else {
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

    const handleAddFriend = (friendUsername) => {
        if (!username) return;
        socket.emit("addFriend", { myUsername: username, friendUsername });
        setRequestedFriends(prev => prev.includes(friendUsername) ? prev : [...prev, friendUsername]);
        setFriendInput("");
        setFriendModalVisible(false);
    };

    const handleWithdrawFriendRequest = (friendUsername) => {
        socket.emit("withdrawFriendRequest", { myUsername: username, friendUsername });
    };

    const handleRespondToFriendRequest = (fromUsername, accept) => {
        socket.emit("respondFriendRequest", {
            requestId: fromUsername,
            action: accept ? "accepted" : "rejected"
        });
        setFriendRequests(prev => prev.filter(user => user !== fromUsername));
        if (accept) {
            showToast("Kết bạn", `Đã chấp nhận lời mời từ ${fromUsername}`, "success");
        } else {
            showToast("Kết bạn", `Đã từ chối lời mời từ ${fromUsername}`, "info");
        }
    };

    useEffect(() => {
        if (!socket) return;

        const handleMessageDeleted = (data) => {
            try {
                const { messageId, room } = typeof data === 'string' ? JSON.parse(data) : data;

                setMessages(prev => prev.filter(msg => getMessageId(msg) !== messageId));

                setActiveChats(prev => {
                    const updated = { ...prev };
                    if (updated[room]) {
                        const remainingMessages = messages.filter(msg => getMessageId(msg) !== messageId);
                        if (remainingMessages.length > 0) {
                            const lastMsg = remainingMessages[remainingMessages.length - 1];
                            updated[room].lastMessage = {
                                text: `${lastMsg.name === username ? 'Bạn' : lastMsg.name}: ${lastMsg.message || 'Đã gửi một tệp đính kèm'}`,
                                time: lastMsg.createdAt
                            };
                        } else {
                            updated[room].lastMessage = {
                                text: 'Chưa có tin nhắn',
                                time: null
                            };
                        }

                        AsyncStorage.setItem('activeChats', JSON.stringify(updated))
                            .catch(err => console.error("Error saving activeChats:", err));
                    }
                    return updated;
                });
            } catch (error) {
                console.error("Error handling message deletion:", error);
            }
        };

        const handleDeleteResult = (data) => {
            try {
                const result = typeof data === 'string' ? JSON.parse(data) : data;
                showToast(
                    "Xóa tin nhắn",
                    result.success ? "Đã xóa tin nhắn thành công" : "Không thể xóa tin nhắn",
                    result.success ? "success" : "error"
                );
            } catch (error) {
                console.error("Error handling delete result:", error);
            }
        };

        socket.on("messageDeleted", handleMessageDeleted);
        socket.on("deleteMessageResult", handleDeleteResult);

        return () => {
            socket.off("messageDeleted", handleMessageDeleted);
            socket.off("deleteMessageResult", handleDeleteResult);
        };
    }, [socket, username, messages]);

    const handleDeleteMessage = (msgId, room) => {
        socket.emit("deleteMessage", { messageId: msgId, room });
    };

    const handleForwardMessage = (msg) => {
        setForwardMessageObj(msg);
        setSelectedForwardRooms([]);
        setForwardModalVisible(true);
    };

    const handleConfirmForward = () => {
        selectedForwardRooms.forEach(roomId => {
            if (roomId !== activeRoom) {
                const forwardMsg = {
                    ...forwardMessageObj,
                    id: Date.now() + Math.floor(Math.random() * 10000),
                    room: roomId,
                    forwardedFrom: {
                        name: forwardMessageObj.name,
                        room: forwardMessageObj.room,
                        message: forwardMessageObj.message,
                        fileUrl: forwardMessageObj.fileUrl,
                        fileType: forwardMessageObj.fileType,
                        fileName: forwardMessageObj.fileName
                    },
                    name: username,
                    createdAt: new Date().toISOString()
                };
                sendMessageHandler(forwardMsg);
            }
        });
        setForwardModalVisible(false);
        setForwardMessageObj(null);
    };

    // Tạo chatList có roomId, sắp xếp mới nhất lên đầu, nhóm mới tạo (chưa có lastMessage) luôn lên đầu
    const chatList = Object.entries(activeChats)
        .map(([room, chat]) => ({ ...chat, room }))
        .sort((a, b) => {
            if (!a.lastMessage && b.lastMessage) return -1;
            if (a.lastMessage && !b.lastMessage) return 1;
            if (!a.lastMessage && !b.lastMessage) return 0;
            const timeA = new Date(a.lastMessage.time).getTime();
            const timeB = new Date(b.lastMessage.time).getTime();
            return timeB - timeA;
        });

    // Đảm bảo realtime friends khi chuyển tab bằng useFocusEffect, chỉ giữ 1 nơi đăng ký các listener
    useFocusEffect(
        React.useCallback(() => {
            if (!socket || !username) return;
            // Đăng ký các listener khi vào tab chat (KHÔNG đăng ký lại friendAccepted ở đây)
            const onFriendsList = (friendsList) => setFriends(friendsList);
            const onFriendRequests = (requests) => setFriendRequests(requests);
            const onSentFriendRequests = (requests) => setRequestedFriends(requests.map(req => req.to));
            const onRespondResult = (data) => {
                if (data.action === 'rejected' && data.from && data.to && data.from === username) {
                    setRequestedFriends(prev => prev.filter(u => u !== data.to));
                }
                showToast("Friend Request", data.message, data.success ? "success" : "info");
                socket.emit("getFriendRequests", username);
                socket.emit("getFriends", username);
            };
            // Thêm listener cho friendAccepted để realtime khi chuyển tab
            const onFriendAccepted = ({ friend, roomId }) => {
                setActiveChats(prev => {
                    const updated = { ...prev };
                    if (!updated[roomId]) {
                        updated[roomId] = { partner: friend, unread: 0, isGroup: false };
                    }
                    AsyncStorage.setItem('activeChats', JSON.stringify(updated)).catch(err => console.error("Error saving activeChats:", err));
                    return updated;
                });
                socket.emit("getFriends", username);
                socket.emit("getFriendRequests", username);
                socket.emit("getSentFriendRequests", username);
                socket.emit("getUserConversations", username);
                if (roomId && (roomId.includes(username) || friend === username)) {
                    socket.emit("join", roomId);
                    joinedRoomsRef.current.add(roomId);
                    setActiveRoom(roomId);
                    AsyncStorage.setItem('activeRoom', roomId).catch(() => {});
                }
                setRequestedFriends(prev => prev.filter(u => u !== friend));
                showToast("Kết bạn", `Bạn đã kết bạn với ${friend} `, "success");
            };
            socket.on("friendsList", onFriendsList);
            socket.on("friendRequests", onFriendRequests);
            socket.on("sentFriendRequests", onSentFriendRequests);
            socket.on("respondFriendRequestResult", onRespondResult);
            socket.on("friendAccepted", onFriendAccepted);
            // Emit lại để lấy dữ liệu mới khi mount
            socket.emit("getFriends", username);
            socket.emit("getFriendRequests", username);
            socket.emit("getSentFriendRequests", username);
            AsyncStorage.getItem('activeChats')
                .then(data => {
                    if (data) {
                        setActiveChats(JSON.parse(data));
                    }
                })
                .catch(err => console.error("Error loading activeChats (focus):", err));
            return () => {
                socket.off("friendsList", onFriendsList);
                socket.off("friendRequests", onFriendRequests);
                socket.off("sentFriendRequests", onSentFriendRequests);
                socket.off("respondFriendRequestResult", onRespondResult);
                socket.off("friendAccepted", onFriendAccepted);
            };
        }, [socket, username])
    );

    useEffect(() => {
        if (searchFilter.trim().length > 0) {
            setIsSearching(true);
        } else {
            setIsSearching(false);
        }
    }, [searchFilter]);

    if (activeRoom) {
        return (
            <>
                <ChatContainer
                    currentRoom={activeRoom}
                    messages={messages}
                    myname={username}
                    sendMessage={sendMessageHandler}
                    message={message}
                    setMessage={setMessage}
                    handleDeleteMessage={handleDeleteMessage}
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
                    friends={friends}
                    requestedFriends={requestedFriends}
                    friendRequests={friendRequests} // truyền đúng object {from, to}
                    handleAddFriend={handleAddFriend}
                    onForwardMessage={handleForwardMessage}
                    setRequestedFriends={setRequestedFriends}
                    socket={socket}
                    forceUpdate={forceUpdate} // Truyền prop forceUpdate để re-render
                />
                <Modal
                    visible={forwardModalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setForwardModalVisible(false)}
                >
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
                        <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 10, width: 320, maxHeight: 400 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Chuyển tiếp tin nhắn</Text>
                            {forwardMessageObj && (
                                <View style={{ backgroundColor: '#e6f7ff', borderLeftWidth: 3, borderLeftColor: '#00bfff', padding: 8, marginBottom: 12, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 13, color: '#007bff', fontWeight: 'bold' }}>Nội dung chuyển tiếp:</Text>
                                    {forwardMessageObj.message ? (
                                        <Text style={{ fontSize: 13, color: '#333', fontStyle: 'italic' }}>{forwardMessageObj.message}</Text>
                                    ) : forwardMessageObj.fileUrl ? (
                                        <Text style={{ fontSize: 13, color: '#333', fontStyle: 'italic' }}>[Tệp] {forwardMessageObj.fileName || 'Tệp đính kèm'}</Text>
                                    ) : null}
                                </View>
                            )}
                            <ScrollView style={{ maxHeight: 220 }}>
                                {Object.entries(activeChats)
                                    .filter(([roomId]) => roomId !== activeRoom)
                                    .map(([roomId, chat]) => (
                                        <TouchableOpacity
                                            key={roomId}
                                            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
                                            onPress={() => {
                                                setSelectedForwardRooms(prev =>
                                                    prev.includes(roomId)
                                                        ? prev.filter(id => id !== roomId)
                                                        : [...prev, roomId]
                                                );
                                            }}
                                        >
                                            <View style={{ width: 24, height: 24, borderWidth: 1, borderColor: '#007bff', borderRadius: 4, marginRight: 8, backgroundColor: selectedForwardRooms.includes(roomId) ? '#007bff' : '#fff', justifyContent: 'center', alignItems: 'center' }}>
                                                {selectedForwardRooms.includes(roomId) && <Text style={{ color: '#fff', fontWeight: 'bold' }}>✓</Text>}
                                            </View>
                                            <Text>{chat.partner || chat.groupName || roomId} {chat.isGroup ? '(Nhóm)' : ''}</Text>
                                        </TouchableOpacity>
                                    ))}
                            </ScrollView>
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
                                <TouchableOpacity onPress={() => setForwardModalVisible(false)} style={{ marginRight: 12 }}>
                                    <Text style={{ color: '#007bff' }}>Hủy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleConfirmForward} disabled={selectedForwardRooms.length === 0}>
                                    <Text style={{ color: selectedForwardRooms.length === 0 ? '#aaa' : '#007bff', fontWeight: 'bold' }}>Chuyển tiếp</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </>
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
                        <TouchableOpacity style={[styles.addButton, { backgroundColor:'transparent'}]} onPress={() => setGroupModalVisible(true)}>
                            <Text style={[styles.addButtonText, { color: '#000' }]}>
                                <MdGroupAdd size={20} />
                            </Text>
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
                                                    uri: getUserAvatarUrl(item.partner, accounts, item.avatar)
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
                    friends={friends}
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
    buttonText: { color: "#fff", fontSize: FontSizes.regular },
    listItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#ddd" },
    itemLabel: { fontWeight: "bold" },
    itemValue: { fontWeight: "normal" },
    chatHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    chatHeaderText: { fontSize: FontSizes.heading },
    addButton: { backgroundColor: "#007bff", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, justifyContent: 'center', alignItems: 'center' },
    addButtonText: { color: "#fff", fontSize: FontSizes.heading },
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
        fontSize: FontSizes.jumbo,
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
        fontSize: FontSizes.medium,
        fontWeight: '600',
    },
    lastMessageTime: {
        fontSize: FontSizes.small,
        color: '#666',
    },
    lastMessageContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessageText: {
        fontSize: FontSizes.regular,
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
        fontSize: FontSizes.small,
        fontWeight: '600',
    },
    noChatsContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
    noChatsText: { fontSize: FontSizes.medium, color: "#888" },
});