// UserScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const UserScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>User</Text>
        </View>
    );
};

export default UserScreen;

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    text: { fontSize: 20 },
});
