import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

const GroupDetailsModal = ({
    groupInfo,
    setGroupDetailsVisible,
    myname,
    handleRemoveGroupMember,
    handleTransferGroupOwner,
    handleAssignDeputy,
    handleCancelDeputy,
    handleAddGroupMember,
    handleLeaveGroup,
    handleDisbandGroup,
    allUsers = [],
}) => {
    const [newMember, setNewMember] = useState('');
    const [selectedNewOwner, setSelectedNewOwner] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const isOwner = groupInfo.owner === myname;
    const isDeputy = Array.isArray(groupInfo.deputies) && groupInfo.deputies.includes(myname);
    const eligibleNewOwners = Array.isArray(groupInfo.members)
        ? groupInfo.members.filter(m => m !== myname)
        : [];

    // Filter out existing members and current user from suggestions
    const filteredUsers = allUsers.filter(user => 
        user.toLowerCase().includes(newMember.toLowerCase()) &&
        !groupInfo.members.includes(user) &&
        user !== myname
    );

    const handleSelectUser = (user) => {
        setNewMember(user);
        setShowSuggestions(false);
    };

    const onAddMember = () => {
        const trimmed = newMember.trim();
        if (trimmed) {
            handleAddGroupMember(trimmed);
            setNewMember('');
        }
    };

    const onClose = () => {
        setGroupDetailsVisible(false);
        setSelectedNewOwner('');
        setNewMember('');
    };

    // Unified handler for leave/disband
    const onLeavePress = () => {
        if (isOwner) {
            // Owner must select a new owner
            if (selectedNewOwner) {
                handleLeaveGroup(selectedNewOwner);
            }
        } else {
            handleLeaveGroup();
        }
    };

    return (
        <Modal
            transparent
            animationType="fade"
            visible
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Group Details</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={styles.close}>X</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.body}>
                        {/* Group info */}
                        <View style={styles.infoSection}>
                            <Text style={styles.infoText}>
                                <Text style={styles.label}>Name: </Text>{groupInfo.groupName}
                            </Text>
                            <Text style={styles.infoText}>
                                <Text style={styles.label}>Owner: </Text>{groupInfo.owner}
                            </Text>
                            <Text style={styles.infoText}>
                                <Text style={styles.label}>Deputies: </Text>
                                {isDeputy || (Array.isArray(groupInfo.deputies) && groupInfo.deputies.length > 0)
                                    ? groupInfo.deputies.join(', ')
                                    : 'None'}
                            </Text>
                        </View>

                        {/* Member list with actions */}
                        <FlatList
                            style={styles.memberList}
                            data={Array.isArray(groupInfo.members) ? groupInfo.members : []}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item: member }) => (
                                <View style={styles.memberRow}>
                                    <Text style={styles.memberName}>{member}</Text>

                                    {(isOwner || isDeputy) && member !== groupInfo.owner && member !== myname && (
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => handleRemoveGroupMember(groupInfo.roomId, member)}
                                        >
                                            <Text style={styles.actionText}>Remove</Text>
                                        </TouchableOpacity>
                                    )}

                                    {isOwner && member !== myname && (
                                        <>
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => handleTransferGroupOwner(groupInfo.roomId, member)}
                                            >
                                                <Text style={styles.actionText}>Transfer</Text>
                                            </TouchableOpacity>

                                            {!groupInfo.deputies.includes(member) ? (
                                                <TouchableOpacity
                                                    style={styles.actionButton}
                                                    onPress={() => handleAssignDeputy(groupInfo.roomId, member)}
                                                >
                                                    <Text style={styles.actionText}>Make Deputy</Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <TouchableOpacity
                                                    style={styles.actionButton}
                                                    onPress={() => handleCancelDeputy(groupInfo.roomId, member)}
                                                >
                                                    <Text style={styles.actionText}>Revoke Deputy</Text>
                                                </TouchableOpacity>
                                            )}
                                        </>
                                    )}
                                </View>
                            )}
                        />

                        {/* Add Member section */}
                        <View style={styles.addMemberSection}>
                            <View style={styles.searchContainer}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Search username to add"
                                    value={newMember}
                                    onChangeText={(text) => {
                                        setNewMember(text);
                                        setShowSuggestions(true);
                                    }}
                                    onSubmitEditing={onAddMember}
                                />
                                <TouchableOpacity
                                    style={[styles.addMemberButton, !newMember.trim() && styles.disabledButton]}
                                    onPress={onAddMember}
                                    disabled={!newMember.trim()}
                                >
                                    <Text style={styles.addMemberText}>Add</Text>
                                </TouchableOpacity>
                            </View>
                            
                            {showSuggestions && newMember.trim() !== '' && (
                                <View style={styles.suggestionsContainer}>
                                    <FlatList
                                        data={filteredUsers}
                                        keyExtractor={(item) => item}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={styles.suggestionItem}
                                                onPress={() => handleSelectUser(item)}
                                            >
                                                <Text>{item}</Text>
                                            </TouchableOpacity>
                                        )}
                                        style={styles.suggestionsList}
                                        nestedScrollEnabled={true}
                                        showsVerticalScrollIndicator={true}
                                    />
                                </View>
                            )}
                        </View>

                        {/* Owner selects new owner before leaving */}
                        {isOwner && (
                            <View style={styles.ownerSection}>
                                <Text style={styles.label}>Select new owner before leaving:</Text>
                                <Picker
                                    selectedValue={selectedNewOwner}
                                    onValueChange={value => setSelectedNewOwner(value)}
                                >
                                    <Picker.Item label="-- Select member --" value="" />
                                    {eligibleNewOwners.map(m => (
                                        <Picker.Item key={m} label={m} value={m} />
                                    ))}
                                </Picker>
                            </View>
                        )}

                        <View style={{height: 30}}></View>

                        {/* Action buttons */}
                        <View style={styles.groupActions}>
                            <TouchableOpacity
                                style={[styles.leaveButton, isOwner && !selectedNewOwner && styles.disabledButton]}
                                onPress={onLeavePress}
                                disabled={isOwner && !selectedNewOwner}
                            >
                                <Text style={styles.leaveText}>{isOwner ? 'Transfer & Leave' : 'Leave Group'}</Text>
                            </TouchableOpacity>

                            {isOwner && (
                                <TouchableOpacity
                                    style={styles.disbandButton}
                                    onPress={handleDisbandGroup}
                                >
                                    <Text style={styles.disbandText}>Disband Group</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    container: { width: '90%', maxHeight: '90%', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
    title: { fontSize: 18, fontWeight: 'bold' },
    close: { fontSize: 18, color: 'red' },
    body: { paddingHorizontal: 16 },
    infoSection: { marginBottom: 12 },
    label: { fontWeight: 'bold' },
    infoText: { fontSize: 16, marginBottom: 4 },
    memberList: { maxHeight: 200, marginBottom: 12 },
    memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#eee' },
    memberName: { flex: 1, fontSize: 16 },
    actionButton: { backgroundColor: '#007bff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginLeft: 6 },
    actionText: { color: '#fff', fontSize: 12 },
    addMemberSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 4, padding: 8 },
    addMemberButton: { backgroundColor: '#007bff', padding: 10, borderRadius: 4, marginLeft: 8 },
    addMemberText: { color: '#fff', fontSize: 14 },
    ownerSection: { marginBottom: 12 },
    groupActions: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderTopWidth: 1, borderColor: '#eee',marginTop:30 },
    leaveButton: { flex: 0.48, backgroundColor: '#ffc107', padding: 12, borderRadius: 4, alignItems: 'center' },
    leaveText: { color: '#fff', fontSize: 16 },
    disbandButton: { flex: 0.48, backgroundColor: '#dc3545', padding: 12, borderRadius: 4, alignItems: 'center' },
    disbandText: { color: '#fff', fontSize: 16 },
    disabledButton: { opacity: 0.5 },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 1,
        width: '100%',
    },
    suggestionsContainer: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        maxHeight: 150,
        zIndex: 2,
        width: '100%',
        elevation: 3,
    },
    suggestionsList: {
        flexGrow: 1,
    },
    suggestionItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
});

export default GroupDetailsModal;
