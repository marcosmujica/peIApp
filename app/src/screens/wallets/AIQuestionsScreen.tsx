import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootNavigator';
import { Colors, FontFamily, Shadows, BorderRadius } from '@/constants/theme';
import { WALLET_AI_QUESTIONS_MAP } from '@/constants/wallet-questions';
import { Typography } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { getLocalWallets, saveLocalWallets, LocalWallet } from '@/storage/wallets.local';
import { aiApi } from '@/api/ai.api';

type Props = NativeStackScreenProps<RootStackParamList, 'AIQuestions'>;

const DEFAULT_FALLBACK_QUESTIONS = [
  "¿Cómo puedo mejorar el balance de esta billetera?",
  "¿Cuáles fueron mis mayores gastos este mes?",
  "Resumen de cobros pendientes para los próximos 7 días",
  "¿Cómo funcionan las transferencias en PeIApp?",
  "Consejos para ahorrar en esta categoría"
];

const ExpandableText: React.FC<{ text: string }> = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = text.length > 80;

  const displayText = isExpanded ? text : (shouldTruncate ? text.substring(0, 80) + '...' : text);

  return (
    <View>
      <Typography variant="bodyBase">{displayText}</Typography>
      {shouldTruncate && (
        <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={{ marginTop: 4 }}>
          <Typography variant="bodySmallStrong" color="primary">
            {isExpanded ? 'Ver menos' : 'Ver más'}
          </Typography>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const AIQuestionsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { walletId } = route.params;
  const { user } = useAuthStore();
  const [wallet, setWallet] = useState<LocalWallet | null>(null);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<LocalWallet['aiHistory']>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const loadWallet = async () => {
      const all = await getLocalWallets();
      const w = all.find(x => x.id === walletId);
      if (w) {
        setWallet(w);
        setHistory(w.aiHistory || []);
      }
    };
    loadWallet();
  }, [walletId]);

  const handleAsk = async (text: string) => {
    if (!text.trim() || !wallet || isLoading) return;

    setIsLoading(true);
    setQuestion('');

    const answer = await aiApi.askWallet({
      walletData: {
        name: wallet.name,
        balance: wallet.balance,
        currency: wallet.currency
      },
      userData: {
        displayName: user?.displayName,
        phoneNumber: user?.phoneNumber
      },
      question: text
    });

    const newHistoryItem = {
      question: text,
      answer: answer || "No se pudo obtener una respuesta.",
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [...(history || []), newHistoryItem];
    setHistory(updatedHistory);

    // Save to local
    const all = await getLocalWallets();
    const idx = all.findIndex(w => w.id === walletId);
    if (idx >= 0) {
      all[idx].aiHistory = updatedHistory;
      await saveLocalWallets(all);
    }

    setIsLoading(false);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleDelete = async (index: number) => {
    // Current history state might be sliced in the UI but here we need the full one
    // Actually, 'history' state IS the full one from the wallet.
    const updatedHistory = history.filter((_, i) => i !== index);
    setHistory(updatedHistory);

    // Save to local
    const all = await getLocalWallets();
    const idx = all.findIndex(w => w.id === walletId);
    if (idx >= 0) {
      all[idx].aiHistory = updatedHistory;
      await saveLocalWallets(all);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Typography variant="headingH3">Calma IA</Typography>
            <View style={styles.iaChipMini}>
              <Ionicons name="sparkles" size={12} color="#FFFFFF" />
            </View>
          </View>
          <Typography variant="captionBase" color="secondary">{wallet?.name}</Typography>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Predefined Questions - MOVED TO TOP */}
          <View style={styles.section}>
            <Typography variant="labelSmall" color="secondary" style={styles.sectionTitle}>Sugerencias</Typography>
            <View style={styles.suggestionsGrid}>
              {(() => {
                const typeQuestions = wallet?.type ? WALLET_AI_QUESTIONS_MAP[wallet.type] : null;
                const questionsToShow = (wallet?.aiQuestions && wallet.aiQuestions.length > 0)
                  ? wallet.aiQuestions
                  : (typeQuestions || DEFAULT_FALLBACK_QUESTIONS);

                return questionsToShow.map((q, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionBtn}
                    onPress={() => handleAsk(q)}
                    disabled={isLoading}
                  >
                    <Typography variant="bodySmall" align="center">{q}</Typography>
                  </TouchableOpacity>
                ));
              })()}
            </View>
          </View>

          {/* Recent Conversations - MOVED BELOW AND LIMITED TO 10 */}
          {history && history.length > 0 && (
            <View style={styles.section}>
              <Typography variant="labelSmall" color="secondary" style={styles.sectionTitle}>Conversaciones recientes</Typography>
              {history.slice(-10).map((item, slicedIdx) => {
                const realIdx = history.length - history.slice(-10).length + slicedIdx;
                return (
                  <View key={realIdx} style={styles.qaCard}>
                    <View style={styles.questionRow}>
                      <View style={styles.userIcon}>
                        <Ionicons name="person" size={14} color={Colors.white} />
                      </View>
                      <Typography variant="bodyBaseStrong" style={{ flex: 1 }}>{item.question}</Typography>
                      <TouchableOpacity onPress={() => handleDelete(realIdx)} style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={16} color={Colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.answerRow}>
                      <View style={styles.aiIcon}>
                        <Ionicons name="sparkles" size={14} color={Colors.white} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ExpandableText text={item.answer} />
                      </View>
                    </View>
                    <Typography variant="labelXSmall" color="secondary" style={{ alignSelf: 'flex-end', marginTop: 8 }}>
                      {new Date(item.timestamp).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Floating Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Escribe tu pregunta aquí..."
            value={question}
            onChangeText={setQuestion}
            multiline
            maxLength={200}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!question.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={() => handleAsk(question)}
            disabled={!question.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="send" size={20} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 64,
    backgroundColor: Colors.white,
    ...Shadows.card,
  },
  backBtn: {
    padding: 4,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  qaCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    ...Shadows.card,
  },
  questionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  answerRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.strokeSubtle,
  },
  userIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestionBtn: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.strokeSubtle,
    width: '48%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.strokeSubtle,
    alignItems: 'flex-end',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#f4f4f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    maxHeight: 100,
    fontFamily: FontFamily.regular,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.textTertiary,
  },
  deleteBtn: {
    padding: 4,
  },
  iaChipMini: {
    backgroundColor: '#7c3aed',
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
