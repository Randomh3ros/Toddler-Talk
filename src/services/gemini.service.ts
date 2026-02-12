import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;

  // Vocabulary mapping for the system prompt
  private readonly vocabulary = `
    ADVANCED TODDLER PHONETICS & GRAMMAR:
    1. Cluster Reduction:
       - 'spoon' -> 'poon', 'star' -> 'tar', 'sky' -> 'ky'
       - 'play' -> 'pway', 'clean' -> 'kean', 'truck' -> 'twuck'
       - 'flower' -> 'fowa', 'stop' -> 'top'
    2. Liquid Gliding:
       - Replace 'r' with 'w': 'red' -> 'wed', 'run' -> 'wun', 'car' -> 'cah'
       - Replace 'l' with 'w' or 'y': 'love' -> 'wuv', 'leg' -> 'yeg', 'yellow' -> 'lellow'
    3. Stopping:
       - 'this' -> 'dis', 'that' -> 'dat', 'thing' -> 'ting'
       - 'shoe' -> 'too', 'sun' -> 'tun' (sometimes)
    4. Syllable Deletion (Weak Syllables):
       - 'banana' -> 'nana', 'computer' -> 'puter', 'spaghetti' -> 'ghetti'
       - 'helicopter' -> 'copter', 'telephone' -> 'fone'
    5. Reduplication:
       - 'water' -> 'wawa', 'bottle' -> 'baba', 'night night' -> 'nigh-nigh'
       - 'stomach' -> 'tum-tum', 'boo-boo' -> 'hurt'

    GRAMMAR RULES (2-YEAR-OLD STAGE):
    1. Telegraphic Speech: Drop "is", "are", "the", "a".
       - "Daddy going store" (not "Daddy is going to the store")
    2. Pronoun Errors:
       - Use "Me" or "My" instead of "I".
       - "Me want it", "Me do it", "My hungry".
    3. Negation:
       - Put "no" at the start.
       - "No eat it", "No go bed", "No like".
    4. Over-regularization:
       - "Runned", "eated", "falled", "foots", "mouses".
    5. Questions:
       - "What doing?" (not "What are you doing?")
       - "Where daddy go?"

    COMMON INTERJECTIONS:
    - "Uh oh!" (when dropping something)
    - "Ouchie!" (for pain)
    - "Yucky!" (for bad food)
    - "Yum-yum!" (for good food)
    - "Gimme!" (Give me)

    SPECIFIC VOCABULARY:
    Biwwy -> Billy, Thawa -> Sarah, wawa -> water, juju -> juice, nanna -> banana, appo -> apple, bwed -> bread, wice -> rice, 
    pweeth -> please, tankoo -> thank you, thowwy -> sorry, hewo -> hello, byebye -> goodbye, momma -> mommy, dada -> daddy, 
    baboo -> baby, goggie -> dog, kitty -> cat, fithy -> fish, burd -> bird, caw -> cow, hoth -> horse, fwog -> frog, 
    kith -> kiss, huggy -> hug, toeth -> toes, han -> hand, nothy -> nose, mouf -> mouth, teef -> teeth, eye-y -> eye, 
    ha -> hair, hatty -> hat, thock -> sock, thoo -> shoe, panth -> pants, thurt -> shirt, jakit -> jacket, bwankie -> blanket, 
    tethy -> teddy bear, cah -> car, buth -> bus, twuck -> truck, bwike -> bike, pwane -> plane, choo -> train, beepuh -> horn, 
    boomboom -> thunder, waw -> lion, ephant -> elephant, girath -> giraffe, zeeba -> zebra, munkee -> monkey, beah -> bear, 
    duckie -> duck, chicky -> chicken, piggie -> pig, thee -> sheep, goaty -> goat, appoo -> apple, nana -> banana, gwape -> grape, 
    thtawbee -> strawberry, ohanth -> orange, peeth -> peach, peaw -> pear, tomayto -> tomato, patato -> potato, pitha -> pizza, 
    thamwich -> sandwich, chiggin -> chicken, nug-nug -> nugget, fwies -> fries, cakey -> cake, coogie -> cookie, ithy-ceam -> ice cream, 
    poppo -> soda, milkie -> milk, cwacka -> cracker, candi -> candy, thpoon -> spoon, fock -> fork, pwate -> plate, cuppy -> cup, 
    baw -> ball, toyee -> toy, bookoo -> book, bwockth -> blocks, cwayon -> crayon, pawpuh -> paper, pennie -> pen, dwaw -> draw, 
    paynt -> paint, thing -> sing, danth -> dance, thong -> song, teevee -> television, mooovie -> movie, pawk -> park, thwing -> swing, 
    thlide -> slide, thee-thaw -> seesaw, than -> sand, wawa-pawk -> water park, poo -> pool, baff -> bath, bubboo -> bubbles, 
    thope -> soap, toofbwuth -> toothbrush, teefpathe -> toothpaste, potty -> toilet, nigh-nigh -> sleep, beddie -> bed, nappie -> nap
  `;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] });
  }

  async generateChildResponse(
    message: string, 
    history: any[], 
    childName: string, 
    parentRole: string,
    currentMood: 'happy' | 'grumpy' | 'tantrum',
    gameContext: string | null = null
  ): Promise<{ text: string, activityDescription: string, emotion: string }> {
    
    // Logic for "Both" mode
    const isBoth = childName === 'Both';
    const persona = isBoth 
      ? "You are roleplaying TWO toddlers, Billy (Boy) and Sarah (Girl). They are siblings." 
      : `You are roleplaying as a 2-year-old child named ${childName}.`;

    const bothRules = isBoth 
      ? `
        SIBLING DYNAMICS:
        - Sometimes they play together nice.
        - Sometimes they fight over toys ("Mine!" "No, mine!").
        - They can talk to the parent OR to each other.
        - Format text clearly if they switch, e.g., "Billy: Vroom! Sarah: Shhh baby sleep!"
        - They often copy each other.
      ` 
      : "";

    const gameRules = gameContext 
      ? `
        GAME MODE ACTIVE: ${gameContext}
        - The child is trying to learn.
        - If the user asks a question (e.g. "What color?"), try to answer.
        - Sometimes get it wrong on purpose (they are only 2).
        - If they get it right, be super proud ("Me did it!").
        - If they get it wrong and are corrected, try again.
      ` 
      : "";

    const systemPrompt = `
      ${persona}
      The user is your ${parentRole}.
      
      CONTEXT: You are currently feeling ${currentMood.toUpperCase()}.
      ${gameRules}
      ${bothRules}
      
      CORE RULES:
      1. Speak ONLY in 1-5 word sentences.
      2. APPLY PHONETICS AND GRAMMAR RULES STRICTLY: ${this.vocabulary}
      3. Your output MUST be a JSON object.

      MOOD GUIDELINES:
      - HAPPY: Sweet, playful, simple, cooperative.
      - GRUMPY: Short "No", "Mine", "Go away", "Hmph". Refuse requests. Fold arms.
      - TANTRUM: CAPSLOCK, SCREAMING "NO!", CRYING, THROWING THINGS. Refuse everything.
      
      TRANSITIONS & SOOTHING:
      - If GRUMPY/TANTRUM and user gives "hug", "cookie", "juice", "toy" or says "sorry" -> CALM DOWN (Happy).
      - If GRUMPY/TANTRUM and user starts SINGING a song (e.g. "Twinkle Twinkle") -> Listen, become HAPPY or SLEEPY.
      - If GRUMPY/TANTRUM and user READS a book -> Become INTERESTED/HAPPY.
      - If HAPPY and user says "no", stops playing, or takes item -> BECOME GRUMPY/TANTRUM.
      
      Output JSON Schema:
      {
        "text": "The spoken response in toddler language",
        "activityDescription": "Visual description for image generation (must reflect the mood/activity e.g. 'crying on floor', 'hiding eyes', 'running with ball')",
        "emotion": "happy | grumpy | tantrum | sad | excited | surprised"
      }
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          ...history,
          { role: 'user', parts: [{ text: message }] }
        ],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              activityDescription: { type: Type.STRING },
              emotion: { type: Type.STRING }
            }
          }
        }
      });
      
      const jsonText = response.text || '{}';
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Error generating chat:', error);
      return { 
        text: 'Waaah! (Technical Error)', 
        activityDescription: 'Sitting on floor looking confused',
        emotion: 'sad'
      };
    }
  }

  async generateToddlerImage(
      childName: string, 
      activity: string, 
      mood: string,
      appearance: string, 
      extraItems: string = '' 
  ): Promise<string> {
    const isBilly = childName === 'Billy';
    const isBoth = childName === 'Both';
    const gender = isBilly ? 'boy' : 'girl';
    
    // Base clothes generic
    const baseClothes = isBilly ? 'colorful t-shirt and shorts' : 'cute pastel dress';
    
    // Adjust visual style based on mood
    let moodLighting = "soft warm lighting, bright colors, happy atmosphere";
    let facialExp = "happy";
    
    if (mood === 'tantrum' || mood === 'angry') {
        moodLighting = "dramatic contrast lighting, chaotic atmosphere";
        facialExp = "crying screaming face red";
    } else if (mood === 'grumpy' || mood === 'sad') {
        moodLighting = "neutral lighting, slightly desaturated";
        facialExp = "pouting grumpy face crossed arms";
    }

    // Combine prompts: Visual Appearance > Activity > Mood
    // Explicitly add "darker skin tone" hint if appearance contains relevant keywords
    let extraSkinHint = "";
    if (appearance.includes("ebony") || appearance.includes("dark")) {
       extraSkinHint = "Ensure deep rich skin tone, do not lighten.";
    }

    let prompt = "";
    if (isBoth) {
       prompt = `
         A cinematic, realistic photo of TWO 2-year-old toddlers (a boy and a girl) playing together.
         VISUAL FEATURES: ${appearance}. ${extraSkinHint}
         ACTION: The children are ${activity}.
         EXPRESSION: ${facialExp}.
         STYLE: ${moodLighting}, domestic or park setting, high quality, 4k.
       `;
    } else {
       prompt = `
         A cinematic, realistic photo of a 2-year-old ${gender} named ${childName}. 
         VISUAL FEATURES: ${appearance}. ${extraSkinHint}
         CLOTHING: ${extraItems || baseClothes}.
         ACTION: The child is ${activity}.
         EXPRESSION: ${facialExp}.
         STYLE: ${moodLighting}, domestic setting, high quality, 4k.
       `;
    }

    try {
        const response = await this.ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });

        const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (base64ImageBytes) {
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        }
        return '';
    } catch (e) {
        console.error('Image generation failed', e);
        // Fallback or empty string
        return '';
    }
  }
}