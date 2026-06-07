import { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View, Image } from "react-native";
import { Text, Chip } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

type Breed = {
  name: string; species: string; origin: string; size: string; lifespan: string;
  temperament: string[]; care: string; exercise: string; goodWith: string[];
  emoji: string; color: string; image: string; about: string; health: string;
};

const BREEDS: Breed[] = [
  { name:"Golden Retriever",species:"dog",origin:"Scotland",size:"Large (25–34 kg)",lifespan:"10–12 years",temperament:["Friendly","Reliable","Kind","Intelligent"],care:"Weekly brushing, monthly baths. Moderate shedder.",exercise:"60–90 min/day — loves fetch and swimming.",goodWith:["Children","Other dogs","Cats","Seniors"],emoji:"🐕",color:"#E8A020",image:"https://images.unsplash.com/photo-1552053831-71594a27632d?w=600",about:"One of the most popular family dogs worldwide. Highly intelligent, easy to train, and endlessly patient with children. Makes an excellent therapy dog.",health:"Watch for hip dysplasia, elbow dysplasia, and heart disease. Annual vet check-ups essential." },
  { name:"Labrador Retriever",species:"dog",origin:"Canada",size:"Large (25–36 kg)",lifespan:"10–12 years",temperament:["Outgoing","Active","Gentle","Loyal"],care:"Weekly brushing, regular ear cleaning. Heavy shedder twice a year.",exercise:"80–90 min/day — swimming is their favourite.",goodWith:["Children","Other dogs","First-time owners"],emoji:"🐶",color:"#C8860A",image:"https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600",about:"The world's most popular breed. Energetic, loving, and food-motivated — extremely easy to train. A true family companion.",health:"Prone to obesity, hip dysplasia, and joint issues. Measure food carefully." },
  { name:"Indian Pariah",species:"dog",origin:"India",size:"Medium (15–25 kg)",lifespan:"13–15 years",temperament:["Alert","Intelligent","Loyal","Hardy"],care:"Low maintenance. Short coat needs minimal grooming. Bathe monthly.",exercise:"45–60 min/day. Highly adaptable to Indian climate.",goodWith:["Experienced owners","Older children"],emoji:"🐕‍🦺",color:"#8B4513",image:"https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600",about:"One of the oldest and most genetically pure breeds in the world. Incredibly hardy, disease-resistant, and perfectly adapted to the Indian subcontinent.",health:"Exceptionally healthy with fewer genetic issues than purebreds. Routine deworming every 3 months." },
  { name:"Beagle",species:"dog",origin:"England",size:"Small-Medium (8–14 kg)",lifespan:"12–15 years",temperament:["Merry","Curious","Friendly","Determined"],care:"Weekly brushing. Clean floppy ears weekly to prevent infection.",exercise:"60 min/day. Needs a secure yard — follows their nose!",goodWith:["Children","Other dogs","Active families"],emoji:"🐾",color:"#D2691E",image:"https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=600",about:"A compact, hardy, sociable hound with an excellent nose. Vocal by nature — tends to howl when lonely.",health:"Watch for epilepsy, hypothyroidism, and hip dysplasia." },
  { name:"Persian",species:"cat",origin:"Persia (Iran)",size:"Medium (3–5 kg)",lifespan:"12–17 years",temperament:["Quiet","Affectionate","Calm","Gentle"],care:"Daily brushing essential. Professional grooming every 6–8 weeks. Wipe face daily.",exercise:"Low — content with indoor play sessions of 20 min/day.",goodWith:["Apartments","Seniors","Quiet households"],emoji:"🐈",color:"#9370DB",image:"https://images.unsplash.com/photo-1513245543132-31f507417b26?w=600",about:"The quintessential lap cat. Serene, loving, and quietly affectionate. Prefers calm, predictable environments.",health:"Prone to polycystic kidney disease (PKD), breathing issues, and dental problems." },
  { name:"Siamese",species:"cat",origin:"Thailand",size:"Medium (3–5 kg)",lifespan:"12–15 years",temperament:["Vocal","Affectionate","Social","Intelligent"],care:"Weekly brushing — very low maintenance coat. Needs lots of social interaction.",exercise:"Moderate — loves interactive toys and puzzle feeders.",goodWith:["Families","Other cats","Active owners"],emoji:"🐱",color:"#4A90D9",image:"https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600",about:"One of the oldest recognised cat breeds. Extremely chatty and social — will follow you around the house all day.",health:"Prone to respiratory issues, dental disease, and progressive retinal atrophy." },
  { name:"Holland Lop Rabbit",species:"rabbit",origin:"Netherlands",size:"Small (1.8–2.2 kg)",lifespan:"7–12 years",temperament:["Docile","Affectionate","Playful","Curious"],care:"Daily fresh hay (80% of diet), leafy greens, pellets. Clean litter daily.",exercise:"3–4 hours of free-roaming time outside cage per day.",goodWith:["Families","Gentle children","Other rabbits"],emoji:"🐇",color:"#FF69B4",image:"https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=600",about:"One of the most popular pet rabbit breeds. Known for lopped ears and compact body. Highly social — thrives with a bonded companion.",health:"GI stasis is the biggest risk — ensure constant hay intake. Neutering recommended." },
  { name:"Indian Ringneck Parakeet",species:"bird",origin:"India",size:"Small (115–140 g)",lifespan:"25–30 years",temperament:["Intelligent","Vocal","Independent","Playful"],care:"Fresh fruits, vegetables, quality pellets daily. Clean cage twice weekly.",exercise:"3–4 hours out-of-cage time daily. Mental stimulation essential.",goodWith:["Experienced owners","Teens and adults"],emoji:"🦜",color:"#00897B",image:"https://images.unsplash.com/photo-1544923246-77307dd654cb?w=600",about:"Native to India and one of the most popular parrots kept as pets. Can learn hundreds of words. Requires significant time and commitment.",health:"Watch for psittacosis, feather plucking, and nutritional deficiencies. Annual avian vet check." },
];

const TABS = [
  {key:"all",label:"All",emoji:"🐾"},
  {key:"dog",label:"Dogs",emoji:"🐕"},
  {key:"cat",label:"Cats",emoji:"🐱"},
  {key:"rabbit",label:"Rabbits",emoji:"🐇"},
  {key:"bird",label:"Birds",emoji:"🦜"},
];

export default function BreedGuideScreen() {
  const router = useRouter();
  const [filter,   setFilter]   = useState("all");
  const [selected, setSelected] = useState<Breed | null>(null);

  const list = filter === "all" ? BREEDS : BREEDS.filter((b) => b.species === filter);

  if (selected) {
    return (
      <View style={s.container}>
        <View style={[s.hero, {backgroundColor: selected.color + "22"}]}>
          <TouchableOpacity style={s.backBtn} onPress={() => setSelected(null)}>
            <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Image source={{ uri: selected.image }} style={s.heroImg} />
          <Text style={s.heroName}>{selected.name}</Text>
          <Text style={s.heroSub}>{selected.emoji}  {selected.species.charAt(0).toUpperCase()+selected.species.slice(1)} · {selected.origin}</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:120}}>
          <View style={s.statsRow}>
            {[["📏 Size",selected.size],["⏳ Lifespan",selected.lifespan]].map(([l,v])=>(
              <View key={l} style={s.statCard}>
                <Text style={s.statLabel}>{l}</Text>
                <Text style={s.statVal}>{v}</Text>
              </View>
            ))}
          </View>
          {[
            {title:"Temperament", node: <View style={s.chips}>{selected.temperament.map(t=>(
              <Chip key={t} style={[s.chip,{backgroundColor:selected.color+"25"}]} textStyle={{color:selected.color,fontWeight:"700",fontSize:12}}>{t}</Chip>
            ))}</View>},
            {title:"About", body: selected.about},
            {title:"🧴 Grooming & Care", body: selected.care},
            {title:"🏃 Exercise Needs", body: selected.exercise},
            {title:"Good With", node: <View style={s.chips}>{selected.goodWith.map(g=>(
              <Chip key={g} style={s.goodChip} textStyle={{fontSize:12,color:colors.success}}>{g}</Chip>
            ))}</View>},
          ].map(({title,body,node})=>(
            <View key={title} style={s.sec}>
              <Text style={s.secTitle}>{title}</Text>
              {body && <Text style={s.secBody}>{body}</Text>}
              {node}
            </View>
          ))}
          <View style={s.healthBox}>
            <View style={s.healthHead}>
              <Ionicons name="medkit-outline" size={18} color={colors.warning} />
              <Text style={[s.secTitle,{color:colors.warning}]}>Health Watch</Text>
            </View>
            <Text style={s.secBody}>{selected.health}</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Breed Guide 📖</Text>
        <View style={{width:40}} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
        {TABS.map(t=>(
          <TouchableOpacity key={t.key} style={[s.filterBtn, filter===t.key && s.filterOn]}
            onPress={()=>setFilter(t.key)} activeOpacity={0.8}>
            <Text style={s.filterEmoji}>{t.emoji}</Text>
            <Text style={[s.filterTxt, filter===t.key && s.filterTxtOn]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
        {list.map(b=>(
          <TouchableOpacity key={b.name} style={s.card} activeOpacity={0.92} onPress={()=>setSelected(b)}>
            <Image source={{uri:b.image}} style={s.cardImg} />
            <View style={[s.colorBar,{backgroundColor:b.color}]} />
            <View style={s.cardInfo}>
              <View style={s.cardTop}>
                <Text style={s.cardName}>{b.name}</Text>
                <Text style={{fontSize:20}}>{b.emoji}</Text>
              </View>
              <Text style={s.cardMeta}>{b.origin} · {b.size}</Text>
              <View style={s.miniChips}>
                {b.temperament.slice(0,3).map(t=>(
                  <View key={t} style={[s.mini,{backgroundColor:b.color+"20"}]}>
                    <Text style={[s.miniTxt,{color:b.color}]}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        ))}
        <View style={{height:120}} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:   {flex:1,backgroundColor:colors.background,paddingTop:spacing.xl},
  header:      {flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:spacing.md,paddingBottom:spacing.md},
  backBtn:     {width:40,alignItems:"flex-start"},
  headerTitle: {fontSize:20,fontWeight:"800",color:colors.onSurface},
  filterScroll:{maxHeight:54,marginBottom:spacing.sm},
  filterRow:   {paddingHorizontal:spacing.md,gap:spacing.sm,alignItems:"center"},
  filterBtn:   {flexDirection:"row",alignItems:"center",gap:5,backgroundColor:colors.surfaceContainerHigh,paddingHorizontal:spacing.md,paddingVertical:7,borderRadius:20},
  filterOn:    {backgroundColor:colors.primary},
  filterEmoji: {fontSize:16},
  filterTxt:   {fontSize:13,fontWeight:"600",color:colors.onSurfaceVariant},
  filterTxtOn: {color:colors.onPrimary},
  list:        {paddingHorizontal:spacing.md,gap:spacing.md},
  card:        {flexDirection:"row",alignItems:"center",backgroundColor:colors.surface,borderRadius:16,overflow:"hidden",elevation:2,shadowColor:"#000",shadowOffset:{width:0,height:2},shadowOpacity:0.08,shadowRadius:6},
  cardImg:     {width:80,height:80},
  colorBar:    {width:4,alignSelf:"stretch"},
  cardInfo:    {flex:1,padding:spacing.md,gap:4},
  cardTop:     {flexDirection:"row",justifyContent:"space-between"},
  cardName:    {fontSize:15,fontWeight:"700",color:colors.onSurface},
  cardMeta:    {fontSize:12,color:colors.onSurfaceVariant},
  miniChips:   {flexDirection:"row",flexWrap:"wrap",gap:4,marginTop:2},
  mini:        {paddingHorizontal:7,paddingVertical:2,borderRadius:8},
  miniTxt:     {fontSize:10,fontWeight:"700"},
  hero:        {alignItems:"center",paddingTop:48,paddingBottom:spacing.lg,gap:spacing.sm,paddingHorizontal:spacing.md},
  heroImg:     {width:120,height:120,borderRadius:24,marginBottom:spacing.sm},
  heroName:    {fontSize:26,fontWeight:"800",color:colors.onSurface,textAlign:"center"},
  heroSub:     {fontSize:14,color:colors.onSurfaceVariant},
  statsRow:    {flexDirection:"row",gap:spacing.sm,paddingHorizontal:spacing.md,paddingTop:spacing.md},
  statCard:    {flex:1,backgroundColor:colors.surface,borderRadius:14,padding:spacing.md,alignItems:"center",gap:4,elevation:1},
  statLabel:   {fontSize:11,fontWeight:"700",color:colors.onSurfaceVariant},
  statVal:     {fontSize:13,fontWeight:"700",color:colors.onSurface,textAlign:"center"},
  sec:         {paddingHorizontal:spacing.md,paddingTop:spacing.lg},
  secTitle:    {fontSize:15,fontWeight:"800",color:colors.onSurface,marginBottom:spacing.sm},
  secBody:     {fontSize:14,lineHeight:22,color:colors.onSurfaceVariant},
  chips:       {flexDirection:"row",flexWrap:"wrap",gap:spacing.sm},
  chip:        {borderRadius:12},
  goodChip:    {backgroundColor:colors.success+"15",borderRadius:12},
  healthBox:   {backgroundColor:colors.warning+"10",marginHorizontal:spacing.md,borderRadius:16,padding:spacing.md,marginTop:spacing.md},
  healthHead:  {flexDirection:"row",alignItems:"center",gap:spacing.sm,marginBottom:spacing.xs},
});
