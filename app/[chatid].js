import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Platform,
    KeyboardAvoidingView,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import {
    doc,
    onSnapshot,
    serverTimestamp,
    collection,
    query,
    orderBy,
    addDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    limit
} from 'firebase/firestore';
import { firestore } from '../firebaseConfig';
import Ionicons from '@expo/vector-icons/Ionicons'
import { useFonts } from 'expo-font';
import axios from 'axios';
import OptionsMenu from './components/OptionsMenu';
import * as Clipboard from 'expo-clipboard'
import OptionsMenuOtherUser from './components/OptionsMenuOtherUser';
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import MessagesItem from './components/Messages';
import CustomHeader from './components/CustomHeader ';
const Messages = () => {

    const [loaded] = useFonts({
        'Outfit-Black-Regular': require('../assets/Outfit-Regular.ttf'),
        'Outfit-Black-Medium': require('../assets/Outfit-Medium.ttf'),
        'Outfit-Black-Bold': require('../assets/Outfit-Bold.ttf'),
    });

    const { username, chatID, searchedUserUID, currentUserUID, userpicture } = useLocalSearchParams();
    const navigation = useNavigation();
    const scrollRef = useRef(null);
    const [seenStatus, setSeenStatus] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [newMessage, setNewMessage] = useState([]);
    const [menuVisible, setMenuVisible] = useState(false);
    const [othermenuVisible, setotherMenuVisible] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [reply, setReply] = useState(null)

    const inputRef = useRef(null)

    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const menuWidth = 200;
    const menuHeight = 170;
    useEffect(() => {
        if (!loaded) {
            return null
        }
    }, [loaded])



    useEffect(() => {
        if (username) navigation.setOptions({
            headerTitle: username,
            headerLeft: () => <CustomHeader userpicture={userpicture} />
        });
    }, [navigation, username, loaded]);

    useEffect(() => {
        listenToMessages(chatID, setMessages);
    }, [chatID, loaded]);

    useEffect(() => {
        if (chatID) {
            const unsubscribe = listenToMessages(chatID, setMessages);
            return () => unsubscribe();
        }
    }, [chatID]);

    useEffect(() => {
        if (scrollRef.current && messages.length > 0) {
            scrollRef.current.scrollToEnd({ animated: true });
        }
    }, [messages]);

    useEffect(() => { setMessages(newMessage) }, [newMessage])

    useEffect(() => {
        const chatRef = doc(firestore, 'Chats', chatID);

        const markAsSeen = async () => {
            await updateDoc(chatRef, {
                [currentUserUID]: true,
            });
        };

        const resetSeenStatus = async () => {
            await updateDoc(chatRef, {
                [currentUserUID]: false,
            });
        };

        markAsSeen();

        const unsubscribe = onSnapshot(chatRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setSeenStatus(data[searchedUserUID]);
            }
        });

        return () => {
            resetSeenStatus();
            unsubscribe();
        };
    }, [chatID, currentUserUID, searchedUserUID]);
    const listenToMessages = (chatID) => {
        const chatDocRef = doc(firestore, 'Chats', chatID);
        const messagesCollectionRef = collection(chatDocRef, 'Messages');

        const messagesQuery = query(
            messagesCollectionRef,
            orderBy('timestamp', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
            const messages = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));
            setNewMessage(messages)
        });

        return unsubscribe;
    };


    const sendMessage = async () => {
        if (input.trim()) {
            const newMessage = {
                from: currentUserUID,
                to: searchedUserUID,
                text: input,
                timestamp: serverTimestamp(),
                username: username,
                replyTo: reply
            };

            const chatDocRef = doc(firestore, 'Chats', chatID);
            const messagesCollectionRef = collection(chatDocRef, 'Messages');
            setInput('');
            setReply(null)
            await addDoc(messagesCollectionRef, newMessage);

            try {
                const userDocRef = doc(firestore, 'Users', searchedUserUID);
                const userDoc = await getDoc(userDocRef);
                const CurrentUserDocRef = doc(firestore, 'Users', currentUserUID);
                const CurrentUserDoc = await getDoc(CurrentUserDocRef);

                if (userDoc.exists()) {
                    const { pushToken } = userDoc.data();
                    const { username } = CurrentUserDoc.data();

                    if (pushToken) {
                        const message = {
                            to: pushToken,
                            sound: Platform.OS === "android" ? null : "default",
                            title: `${username}`,
                            body: `${input}`,
                            data: { chatID, newMessage },
                            priority: "high",
                            channelId: "messages",
                            vibrate: true,
                        };

                        try {
                            const response = await axios.post('https://exp.host/--/api/v2/push/send?useFcmV1=true', message, {
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                            });
                        } catch (error) { console.log(error) }

                    }
                }
            } catch (error) {
            }

        }
    };

    const handleLongPress = (event, message) => {
        const { pageX, pageY } = event.nativeEvent;
        let x = pageX;
        let y = pageY;

        if (x + menuWidth > screenWidth) {
            x = screenWidth - menuWidth - 10;
        }

        if (x < 10) {
            x = 10;
        }
        if (y + menuHeight > screenHeight) {
            y = screenHeight - menuHeight - 10;
        }

        if (y < 10) {
            y = 10;
        }
        setMenuPosition({ x, y });
        setSelectedMessage(message);
        if (message.from === currentUserUID) setMenuVisible(true);
        else setotherMenuVisible(true)
    };

    const handleOptionSelect = async (option) => {
        setMenuVisible(false);
        setotherMenuVisible(false)
        if (option === 'copy') {
            await Clipboard.setStringAsync(selectedMessage.text)
        }
        else if (option === 'delete') {
            const docRef = doc(firestore, "Chats", chatID, "Messages", selectedMessage.id)
            await deleteDoc(docRef)
        }
        else if (option === 'reply') {
            setReply(selectedMessage.text);
            inputRef.current.focus();
        }
    };

    if (!loaded) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#171722',
                }}
            >
                <ActivityIndicator size="large" color="#FF8C00" />
            </View>
        );
    }

    return (
        <GestureHandlerRootView>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} // Offset to handle the keyboard
            >

                <SafeAreaView style={[styles.container, { paddingTop: 0, marginTop: 0 }]}>
                    <FlatList
                        keyboardShouldPersistTaps="handled"
                        ref={scrollRef}
                        overScrollMode="never"
                        style={styles.flatlist}
                        data={(messages || []).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))}
                        renderItem={({ item, index }) => (
                            <View style={{}}>
                                <MessagesItem
                                    item={item}
                                    index={index}
                                    handleLongPress={handleLongPress}
                                    currentUserUID={currentUserUID}
                                    setReplyTo={(item) => { setReply(item) }}
                                    scrollRef={scrollRef}
                                />
                            </View>
                        )}
                        keyExtractor={(item, index) => index}
                        onContentSizeChange={() => scrollRef.current?.scrollToEnd()
                        }
                        onLayout={() => scrollRef.current?.scrollToEnd({ animated: true })}
                    />
                    {seenStatus &&
                        <View style={{ flexDirection: 'row-reverse', marginHorizontal: 10, marginVertical: 2 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.15)', fontFamily: 'Outfit-Black-Regular' }}> InTouch with you now... </Text>
                        </View>
                    }
                    {reply &&
                        <View style={{ marginHorizontal: 10, borderTopColor: 'rgba(128,128,128,0.3)', borderTopWidth: 1 }}>

                            <View style={styles.replyContainer}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{
                                        color: 'rgba(128,128,128,0.7)',
                                        fontSize: 12,
                                        fontFamily: 'Outfit-Black-Medium',
                                        width: 'auto',
                                    }}>
                                        Reply to
                                    </Text>
                                    <Text numberOfLines={1} style={styles.replyText}>
                                        {reply}
                                    </Text>
                                </View>

                                <TouchableOpacity onPress={() => { setReply(null) }}>
                                    <Ionicons name='close-outline' style={{ paddingHorizontal: 0 }} size={17} color={'#ff9301'} />
                                </TouchableOpacity>
                            </View>
                        </View>

                    }
                    <View style={styles.inputContainer}>
                        <TextInput
                            cursorColor={'#ff9301'}
                            ref={inputRef}
                            style={styles.input}
                            placeholder="Type a message..."
                            value={input}
                            onChangeText={setInput}
                            placeholderTextColor={'rgba(128,128,128,0.6)'}
                            onSubmitEditing={sendMessage}
                            returnKeyType="send"
                        />
                        <TouchableOpacity onPress={sendMessage}>
                            <Ionicons name='send' size={27} color={'#FF8C00'} />
                        </TouchableOpacity>

                        <OptionsMenu
                            visible={menuVisible}
                            onClose={() => setMenuVisible(false)}
                            position={menuPosition}
                            onOptionSelect={handleOptionSelect}
                        />

                        <OptionsMenuOtherUser
                            visible={othermenuVisible}
                            onClose={() => setotherMenuVisible(false)}
                            position={menuPosition}
                            onOptionSelect={handleOptionSelect} />
                    </View>
                </SafeAreaView>
            </KeyboardAvoidingView >
        </GestureHandlerRootView>
    );
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#171722',
    },
    flatlist: {
        flexGrow: 1,
        backgroundColor: '#171722',
        paddingBottom: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1f1f2d',
        borderRadius: 15,
        padding: 13,
        marginHorizontal: 10,
    },
    input: {
        flex: 1,
        marginRight: 10,
        backgroundColor: 'transparent',
        fontSize: 18,
        color: 'white',
        fontFamily: 'Outfit-Black-Regular'
    },
    sentMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#ff9301',
        borderRadius: 20,
        padding: 10,
        marginVertical: 5,
        marginHorizontal: 10,
        maxWidth: '70%',
    },
    receivedMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#1f1f2d',
        borderRadius: 20,
        padding: 10,
        marginVertical: 5,
        marginHorizontal: 10,
        maxWidth: '70%',
    },
    sentText: {
        fontFamily: 'Outfit-Black-Medium',
        fontSize: 15
    },
    receivedText: {
        color: 'white',
        fontFamily: 'Outfit-Black-Medium',
        fontSize: 15
    },
    sentReplyText: {
        fontFamily: 'Outfit-Black-Regular',
        fontSize: 13,
        fontStyle: 'italic'
    },
    receivedReplyText: {
        color: 'white',
        fontFamily: 'Outfit-Black-Regular',
        fontSize: 13,
        fontStyle: 'italic'
    },
    replyText: {
        fontFamily: 'Outfit-Black-Regular',
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        width: '100%',
    },
    replyContainer: {
        width: '100%',
        justifyContent: 'space-between',
        borderRadius: 6,
        paddingHorizontal: 3,
        flexDirection: 'row',
        alignItems: 'center',
    }
});

export default Messages;
