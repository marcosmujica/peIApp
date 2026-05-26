import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import YouTubePlayer from '@/components/ui/YouTubePlayer';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { Typography } from '@/components/ui/Typography';

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = 200;

const VIDEOS = [
  {
    id: 'J1cWzzRNyE8',
    title: '15 Lecciones de Educación Financiera',
    author: 'ADN Financiero',
    duration: '22:30',
    thumbnail: 'https://img.youtube.com/vi/J1cWzzRNyE8/mqdefault.jpg',
    description: 'Lecciones poderosas de educación financiera y finanzas personales para mejorar tu IQ financiero.'
  },
  {
    id: 'vePC1Ym5x-8',
    title: 'Educación Financiera Para Principiantes',
    author: 'Hábito Emprendedor',
    duration: '18:45',
    thumbnail: 'https://img.youtube.com/vi/vePC1Ym5x-8/mqdefault.jpg',
    description: 'Cómo tomar el control de tu dinero y finanzas personales desde cero.'
  },
  {
    id: 'WF6qLnuh4EA',
    title: 'Cómo ordenar tus finanzas en 7 pasos',
    author: 'Moris Dieck',
    duration: '15:20',
    thumbnail: 'https://img.youtube.com/vi/WF6qLnuh4EA/mqdefault.jpg',
    description: 'Un plan paso a paso para organizar tus finanzas personales y empezar a ahorrar.'
  },
  {
    id: '9sCVcWD1Svs',
    title: 'Educación Financiera: Lo PRIMERO que debes saber',
    author: 'Better Wallet en Español',
    duration: '12:10',
    thumbnail: 'https://img.youtube.com/vi/9sCVcWD1Svs/mqdefault.jpg',
    description: 'Los fundamentos esenciales que todo principiante necesita dominar.'
  },
  {
    id: 'zhfVRXsqQHU',
    title: 'La Psicología del Dinero - Resumen Animado',
    author: 'Gurú Financiero',
    duration: '14:55',
    thumbnail: 'https://img.youtube.com/vi/zhfVRXsqQHU/mqdefault.jpg',
    description: 'Resumen del best-seller de Morgan Housel sobre la relación emocional con el dinero.'
  },
  {
    id: 'X38MGyuc0ds',
    title: 'Cómo funcionan las Finanzas',
    author: 'Aprendiz Financiero',
    duration: '16:30',
    thumbnail: 'https://img.youtube.com/vi/X38MGyuc0ds/mqdefault.jpg',
    description: 'Explicación clara y sencilla de cómo funciona el sistema financiero para principiantes.'
  },
  {
    id: 'KL_W7I1HZlE',
    title: 'Warren Buffett: Cambia tu Futuro Financiero',
    author: 'Financial Mentors TV',
    duration: '20:15',
    thumbnail: 'https://img.youtube.com/vi/KL_W7I1HZlE/mqdefault.jpg',
    description: 'El discurso de Warren Buffett que cambiará tu forma de pensar sobre el dinero.'
  },
  {
    id: 'ap_tK2-HSN0',
    title: 'Curso GRATIS de Educación Financiera',
    author: 'Hábito Emprendedor',
    duration: '45:00',
    thumbnail: 'https://img.youtube.com/vi/ap_tK2-HSN0/mqdefault.jpg',
    description: 'Curso completo y gratuito para aprender a organizar tus finanzas personales.'
  },
  {
    id: 'W4ZGWyl_XZM',
    title: 'El secreto para mejores decisiones financieras',
    author: 'TEDx Talks - Moris Dieck',
    duration: '13:40',
    thumbnail: 'https://img.youtube.com/vi/W4ZGWyl_XZM/mqdefault.jpg',
    description: 'Charla TEDx sobre cómo tomar decisiones financieras más inteligentes en tu vida diaria.'
  },
  {
    id: 'UhzdeGjLJ78',
    title: 'Curso Completo de Finanzas Personales',
    author: 'Andrés Garza',
    duration: '52:00',
    thumbnail: 'https://img.youtube.com/vi/UhzdeGjLJ78/mqdefault.jpg',
    description: 'Todo lo que necesitas saber sobre finanzas personales en un solo video completo.'
  },
];

export const VideosScreen: React.FC = () => {
  const navigation = useNavigation();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const toggleVideo = (id: string) => {
    if (playingId === id) {
      setIsPaused(!isPaused);
    } else {
      setPlayingId(id);
      setIsPaused(false);
    }
  };

  const onStateChange = useCallback((state: string) => {
    if (state === 'ended') {
      setPlayingId(null);
      setIsPaused(false);
    } else if (state === 'paused') {
      setIsPaused(true);
    } else if (state === 'playing') {
      setIsPaused(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Typography variant="headingH2">Información Financiera</Typography>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Typography variant="bodyBase" color="secondary" style={styles.intro}>
          Aprende con los mejores expertos y toma el control de tu futuro financiero.
        </Typography>

        <View style={styles.videoGrid}>
          {VIDEOS.map((video) => (
            <View key={video.id} style={styles.videoCard}>
              {playingId === video.id ? (
                <TouchableOpacity 
                  activeOpacity={1}
                  onPress={() => toggleVideo(video.id)}
                  style={styles.playerWrapper}
                >
                  <YouTubePlayer
                    height={VIDEO_HEIGHT}
                    videoId={video.id}
                    play={!isPaused}
                    onStateChange={onStateChange}
                  />
                  {isPaused && (
                    <View style={styles.pausedOverlay}>
                      <Ionicons name="play" size={60} color={Colors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  activeOpacity={0.9}
                  onPress={() => toggleVideo(video.id)}
                  style={styles.thumbnailContainer}
                >
                  <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
                  <View style={styles.playOverlay}>
                    <Ionicons name="play" size={40} color={Colors.white} />
                  </View>
                  <View style={styles.durationBadge}>
                    <Typography variant="labelXSmall" color={Colors.white}>{video.duration}</Typography>
                  </View>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                onPress={() => toggleVideo(video.id)}
                style={styles.videoInfo}
              >
                <Typography variant="bodyLargeStrong" numberOfLines={2}>{video.title}</Typography>
                <Typography variant="labelSmall" color={Colors.primary} style={styles.author}>
                  {video.author}
                </Typography>
                <Typography variant="labelSmall" color="secondary" numberOfLines={2} style={styles.description}>
                  {video.description}
                </Typography>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  intro: {
    marginBottom: 24,
  },
  videoGrid: {
    gap: 24,
  },
  videoCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    ...Shadows.card,
    borderWidth: 1,
    borderColor: Colors.strokeSubtle,
  },
  playerWrapper: {
    height: VIDEO_HEIGHT,
    backgroundColor: '#000',
  },
  thumbnailContainer: {
    height: VIDEO_HEIGHT,
    position: 'relative',
    backgroundColor: Colors.surfaceMuted,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoInfo: {
    padding: 16,
    gap: 4,
  },
  author: {
    fontFamily: FontFamily.bold,
  },
  description: {
    marginTop: 4,
    lineHeight: 18,
  },
  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
