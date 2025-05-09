import React from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet
} from 'react-native';

const GroupChatModal = ({
    groupName,
    setGroupName,
    accounts,
    selectedMembers,
    setSelectedMembers,
    myname,
    setGroupModalVisible,
    handleCreateGroup,
    friends,
}) => {
    return (
        <Modal
            transparent={true}
            animationType="fade"
            visible={true}
            onRequestClose={() => setGroupModalVisible(false)}
        >
            <View
                style={styles.modalOverlay}
                activeOpacity={1}
                onPressOut={() => setGroupModalVisible(false)}
            >                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Tạo Nhóm Chat</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setGroupModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={styles.input}
                        placeholder="Tên nhóm chat"
                        value={groupName}
                        onChangeText={setGroupName}
                    />
                    <Text style={styles.subtitle}>Chọn thành viên:</Text>                    <ScrollView style={styles.membersContainer}>
                        {accounts
                            .filter((acc) => acc.username !== myname && friends.includes(acc.username))
                            .map((account, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={styles.memberItem}
                                    onPress={() => {
                                        const username = account.username;
                                        setSelectedMembers((prev) =>
                                            prev.includes(username)
                                                ? prev.filter((u) => u !== username)
                                                : [...prev, username]
                                        );
                                    }}
                                >
                                    <Text style={styles.memberText}>{account.username}</Text>
                                    {selectedMembers.includes(account.username) && (
                                        <Text style={styles.checkMark}>✔</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        {accounts.filter(acc => acc.username !== myname && friends.includes(acc.username)).length === 0 && (
                            <View style={styles.noFriendsContainer}>
                                <Text style={styles.noFriendsText}>Bạn cần có ít nhất một người bạn để tạo nhóm chat</Text>
                            </View>
                        )}
                    </ScrollView>                    <TouchableOpacity 
                        style={[
                            styles.createButton, 
                            selectedMembers.length < 2 && styles.createButtonDisabled
                        ]} 
                        onPress={handleCreateGroup}
                        disabled={selectedMembers.length < 2}
                    >
                        <Text style={styles.createButtonText}>
                            {selectedMembers.length < 2 
                                ? `Chọn thêm ${2 - selectedMembers.length} thành viên` 
                                : "Tạo Nhóm"
                            }
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        padding: 8,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 5,
    },
    membersContainer: {
        maxHeight: 200,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        padding: 5,
    },
    memberItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    memberText: {
        fontSize: 16,
    },
    checkMark: {
        fontSize: 16,
        color: 'green',
    },
    createButton: {
        backgroundColor: '#007bff',
        padding: 10,
        borderRadius: 4,
        alignItems: 'center',
    },
    createButtonDisabled: {
        backgroundColor: '#cccccc',
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    noFriendsContainer: {
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noFriendsText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    closeButton: {
        padding: 5,
        borderRadius: 15,
        backgroundColor: '#f0f0f0',
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        color: '#666',
        fontWeight: 'bold',
    },
});

export default GroupChatModal;
