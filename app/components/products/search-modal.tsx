import { Image, Modal, Pressable, TouchableOpacity, View } from "react-native";
import { Text } from "../themed/theme";
import { Ionicons } from "@expo/vector-icons";
import { Input, InputField, InputIcon } from "../ui/input";
import { ScrollView } from "react-native";
import { Link, router } from "expo-router";
import { useState } from "react";
import { axiosInstance } from "@/utils/axios";
import { SearchIcon } from "lucide-react-native";

export const SearchModal = ({
  visible,
  onClose,
  searchQuery,
  setSearchQuery,
  categoryId,
  categoryName,
}: {
  visible: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryName: string;
  categoryId: number;
}) => {
  const [searchResults, setSearchResults] = useState<string[]>([]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      try {
        const response = await axiosInstance.get(
          "/products/search/suggestions",
          {
            params: {
              q: query,
              ...(categoryId ? { categoryId } : {}),
            },
          },
        );

        setSearchResults(response.data);
        console.log(response.data);
      } catch (error) {
        console.log("Search error:", error);
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  };
  const highlightText = (text: string, query: string) => {
    if (!query) return <Text>{text}</Text>;

    const regex = new RegExp(`(${query})`, "i");
    const parts = text.split(regex);

    return (
      <Text className="text-lg font-medium ml-2 flex flex-row flex-wrap">
        {parts.map((part, index) =>
          regex.test(part) ? (
            <Text key={index} className=" font-bold">
              {part}
            </Text>
          ) : (
            <Text key={index} className="font-light">
              {part}
            </Text>
          ),
        )}
      </Text>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50">
        <View className="flex-1 bg-background-light mt-20 rounded-t-3xl p-5">
          {/* Header */}
          <View className="flex flex-row justify-between items-center mb-4">
            <Text className="text-2xl font-semibold">Search</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <Input className="bg-background-50 h-12 flex flex-row justify-center rounded-2xl border border-outline-200 mb-4">
            <Ionicons name="search" size={20} color="#666" className="ml-4" />

            <InputField
              placeholder={
                categoryName
                  ? `Search in "${categoryName}"`
                  : "Search products, brands, and more"
              }
              className="text-lg h-12 text-typography-black"
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={handleSearch}
              autoFocus
            />
          </Input>

          {/* Results */}
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="border-b border-gray-300 mt-2" />

            {searchResults.length > 0 ? (
              <View className="flex  mt-4 flex-col">
                {searchResults.map((product, index) => (
                  <Pressable
                    key={Math.random()}
                    className=""
                    onPress={() => {
                      onClose();
                      setSearchQuery("");
                      setSearchResults([]);
                      router.push(
                        `/product/search?${new URLSearchParams({
                          ...(product ? { query: product } : {}),
                          ...(categoryId ? { categoryId } : {}),
                          ...(categoryName ? { categoryName } : {}),
                        } as {}).toString()}`,
                      );
                    }}
                  >
                    <View className="py-3 flex-row items-center ">
                      <SearchIcon size={14} className="mr-2" />
                      {highlightText(product, searchQuery)}
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text className="text-center text-typography-black/70 mt-6">
                {searchQuery.length > 2
                  ? "No results found"
                  : "Enter at least 3 characters to search"}
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
