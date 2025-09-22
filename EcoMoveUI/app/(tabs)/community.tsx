import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  KeyboardAvoidingView,
} from "react-native";
import Spacer from "@/components/spacer";
import * as ImagePicker from "expo-image-picker";
import {
  MapPin,
  Phone,
  Clock,
  ImagePlus,
  Send,
  ThumbsUp,
  MessageCircle,
  Bookmark,
  Plus,
} from "lucide-react-native";
import { BASE_URL } from "@/constants/server";
type Post = {
  id: number;
  title: string;
  description: string;
  location: string;
  phone: string;
  photo_url?: string | null;
  created_at: string;
};
import { useRouter } from "expo-router";

export default function CommunityBoardScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const router = useRouter();
  const normalizePhotoUrl = (raw?: string | null): string | null => {
    if (!raw) return null;

    let s = String(raw).trim().replace(/\\/g, "/");

    if (/^(data:|file:|content:|asset:)/i.test(s)) return s;

    if (/^https?:\/\//i.test(s)) return encodeURI(s);

    if (/^\/\//.test(s)) return "https:" + s;

    const base = BASE_URL.replace(/\/+$/, "");
    s = s.replace(/^\/+/, "");
    return encodeURI(`${base}/${s}`);
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch(`${BASE_URL}/posts`);
      const data: Post[] = await res.json();
      setPosts(data);
    } catch (e) {
      Alert.alert("Error", "Could not load posts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to add an image.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!res.canceled) {
      setPhotoUri(res.assets[0].uri);
    }
  };

  const validate = () => {
    if (!title.trim()) return "Please enter a title.";
    if (!description.trim()) return "Please enter a description.";
    if (!location.trim()) return "Please enter a location.";
    if (!/^\+?[0-9 ()-]{7,}$/.test(phone.trim()))
      return "Please enter a valid phone number.";
    return null;
  };
  const formatPhone = (input: string) => {
    const digits = (input.match(/\d/g) || []).join("");

    let cc = "";
    let rest = digits;
    if (rest.length > 0 && rest[0] === "1") {
      cc = "1";
      rest = rest.slice(1);
    }

    let out = "";
    if (rest.length <= 3) {
      out = rest;
    } else if (rest.length <= 6) {
      out = `(${rest.slice(0, 3)}) ${rest.slice(3)}`;
    } else {
      out = `(${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6, 10)}`;
    }

    if (cc) out = `+${cc} ${out}`;
    return { formatted: out.trim(), digits };
  };
  const submit = async () => {
    const err = validate();
    if (err) {
      Alert.alert("Check form", err);
      return;
    }
    try {
      setSubmitting(true);

      let res: Response;
      if (photoUri) {
        const form = new FormData();
        form.append("title", title);
        form.append("description", description);
        form.append("location", location);
        form.append("phone", phone);
        form.append("photo", {
          uri: photoUri,
          name: "photo.jpg",
          type: "image/jpeg",
        } as any);
        res = await fetch(`${BASE_URL}/posts`, {
          method: "POST",
          body: form,
          headers: { Accept: "application/json" },
        });
      } else {
        res = await fetch(`${BASE_URL}/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description, location, phone }),
        });
      }

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to create post");
      }

      const created: Post = await res.json();
      setPosts((p) => [created, ...p]);

      setShowForm(false);
      setSubmitting(false);
      setPhotoUri(undefined);
      setTitle("");
      setDescription("");
      setLocation("");
      setPhone("");
      router.replace("/(tabs)/community");
    } catch (e: any) {
      setSubmitting(false);
      Alert.alert("Error", e?.message || "Could not create post.");
    }
  };

  const timeAgo = (iso: string) => {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const s = Math.max(1, Math.floor((now - then) / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  };

  const PostCard = ({ p }: { p: Post }) => {
    const imgUri = normalizePhotoUrl(p.photo_url);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.author}>Community Member</Text>
              <View style={styles.freePill}>
                <Text style={styles.freePillText}>free</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <MapPin size={14} color="#6b7b70" />
              <Text style={styles.metaText} numberOfLines={1}>
                {p.location}
              </Text>
              <Clock size={14} color="#6b7b70" style={{ marginLeft: 10 }} />
              <Text style={styles.metaText}>{timeAgo(p.created_at)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.cardTitle}>{p.title}</Text>
        <Text style={styles.cardDesc}>{p.description}</Text>

        {p.photo_url ? (
          <Image
            source={{ uri: imgUri }}
            style={styles.cardImage}
            onError={(e) => {
              console.warn("Bad image URI:", imgUri, e.nativeEvent?.error);
            }}
          />
        ) : null}

        <View style={styles.tagPill}>
          <Text style={styles.tagLeft}>
            {formatPhone(String(p.phone)).formatted || p.phone}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <View style={styles.action}>
            <ThumbsUp size={16} color="#546b5f" />
            <Text style={styles.actionTxt}>--</Text>
          </View>
          <View style={styles.action}>
            <MessageCircle size={16} color="#546b5f" />
            <Text style={styles.actionTxt}>--</Text>
          </View>
          <View style={styles.action}>
            <Bookmark size={16} color="#546b5f" />
            <Text style={styles.actionTxt}>Save</Text>
          </View>
          <View style={{ flex: 1 }} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={{ marginTop: 30, alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingVertical: 12 }}
        >
          <Text style={styles.title}>Community Board</Text>
          <Text style={styles.subtitle}>
            Connect with neighbors to reduce waste
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => setShowForm(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.plus}>
              <Plus color={"white"} />
            </Text>
            <Text style={styles.btnText}>Create New Post</Text>
          </TouchableOpacity>

          {posts.length === 0 ? (
            <Text
              style={{ textAlign: "center", color: "#6b7b70", marginTop: 40 }}
            >
              No posts yet. Be the first to share!
            </Text>
          ) : (
            posts.map((p) => <PostCard key={p.id} p={p} />)
          )}
          <Spacer />
        </ScrollView>
      )}
      <Modal
        visible={showForm}
        animationType="slide"
        onRequestClose={() => setShowForm(false)}
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: "#fff" }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={
            Platform.select({ ios: 12, android: 0 }) as number
          }
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Post</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={styles.close}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {/* Photo picker */}
            <Text style={styles.label}>Photo</Text>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={{ opacity: 0.6 }}>No photo selected</Text>
              </View>
            )}
            <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage}>
              <ImagePlus size={18} color="#185f36" />
              <Text style={styles.secondaryText}>Choose Photo</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Free Moving Boxes - 15 Large, 10 Medium"
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Details, pickup location/time, condition..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="City, State"
              value={location}
              onChangeText={setLocation}
              returnKeyType="next"
            />

            <Text style={styles.label}>Phone</Text>
            <View
              style={[
                styles.input,
                { flexDirection: "row", alignItems: "center", gap: 8 },
              ]}
            >
              <Phone size={16} color="#4c6b5b" />
              <TextInput
                style={{ flex: 1, paddingVertical: 0 }}
                placeholder="(123) 456-7890"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 14 }]}
              onPress={submit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Send size={18} color="#fff" />
                  <Text style={styles.btnText}>Post</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#197b3b",
    textAlign: "center",
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6a7a6f",
    textAlign: "center",
    marginBottom: 14,
  },
  primaryBtn: {
    backgroundColor: "#12a151",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  btnText: { color: "white", fontWeight: "700", fontSize: 16 },
  plus: { color: "white", fontSize: 18, marginTop: -2 },
  modalHeader: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e6e6e6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  close: { color: "#555", fontWeight: "600" },
  form: { padding: 16, gap: 10 },
  label: { fontWeight: "700", marginTop: 6, marginBottom: 4, color: "#2a2a2a" },
  input: {
    borderWidth: 1,
    borderColor: "#d9e6dc",
    backgroundColor: "#eaf8ef",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  multiline: { minHeight: 110 },
  photo: { width: "100%", height: 180, borderRadius: 12 },
  photoPlaceholder: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d9e6dc",
    backgroundColor: "#f6fbf8",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#f2f8f4",
    borderWidth: 1,
    borderColor: "#cfe3d6",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  secondaryText: { color: "#185f36", fontWeight: "600" },
  card: {
    marginHorizontal: 2,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e6efe9",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 6,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e5efe9",
  },
  author: { fontWeight: "700", color: "#2a2a2a" },
  freePill: {
    marginLeft: 8,
    backgroundColor: "#e7fbef",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#bff1d2",
  },
  freePillText: { color: "#10a350", fontWeight: "700", fontSize: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  metaText: { color: "#6b7b70", fontSize: 12, marginLeft: 3, maxWidth: 180 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2b3d33",
    marginTop: 6,
    marginBottom: 4,
  },
  cardDesc: { color: "#4a5a51", lineHeight: 20, marginBottom: 8 },
  cardImage: { width: "100%", height: 170, borderRadius: 12, marginBottom: 10 },
  tagPill: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d6e7dc",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tagLeft: { color: "#2b4b3b", fontWeight: "700" },
  tagRight: { color: "#2b4b3b", fontWeight: "700" },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 16,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionTxt: { color: "#546b5f", fontWeight: "600" },
  replyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e9faf0",
    borderWidth: 1,
    borderColor: "#c5efd9",
  },
  replyTxt: { color: "#0a8f46", fontWeight: "800" },
});
