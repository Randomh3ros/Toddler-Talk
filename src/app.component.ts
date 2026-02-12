import { Component, ElementRef, ViewChild, inject, signal, effect, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';
import { SpeechService } from './services/speech.service';
import { SoundService } from './services/sound.service';
import { FormsModule } from '@angular/forms';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: string;
  activity?: string;
}

interface StoreItem {
  id: string;
  name: string;
  type: 'food' | 'toy' | 'clothing';
  price: number;
  icon: string;
  description: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: string;
}

interface ParentProfile {
    raceLabel: string;
    skinDescription: string;
    hairDescription: string;
    bodyType: string;
    // New Traits
    hairColor: string;
    eyeColor: string;
    clothingStyle: string;
    hairStyle: string;
    facialFeatures: string;
}

type Stage = 'setup-parent' | 'setup-child' | 'chat';
type Child = 'Billy' | 'Sarah' | 'Both';
type Parent = 'Momma' | 'Dada';
type Mood = 'happy' | 'grumpy' | 'tantrum';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  gemini = inject(GeminiService);
  speech = inject(SpeechService);
  sound = inject(SoundService);

  stage = signal<Stage>('setup-parent');
  parentRole = signal<Parent>('Momma');
  selectedChild = signal<Child>('Billy');
  lastResponder = signal<'Billy' | 'Sarah'>('Sarah'); // For 'Both' alternation

  messages = signal<ChatMessage[]>([]);
  
  // State
  currentMood = signal<Mood>('happy');
  messageCount = signal(0);
  currentGame = signal<string | null>(null); // "Colors", "Shapes", "Counting"
  
  // Customization Options
  hairColors = ['Black', 'Brown', 'Blonde', 'Red', 'Grey', 'Blue Dyed', 'Auburn'];
  eyeColors = ['Brown', 'Blue', 'Green', 'Hazel', 'Grey'];
  clothingStyles = ['Casual (T-shirt/Jeans)', 'Business (Suit)', 'Comfy (Sweats)', 'Boho (Flowy)', 'Athletic (Sporty)', 'Hipster', 'Work Uniform'];
  
  hairStyles = [
    'Long Straight', 'Short Curly', 'Bald', 'Bob Cut', 'Messy Bun', 'Crew Cut', 
    'Dreads', 'Braids', 'Afro', 'Ponytail', 'Spiky', 'Wavy Shoulder-length'
  ];
  
  facialFeatureOptions = [
    'None', 'Freckles', 'Dimples', 'Glasses', 'Beard', 'Mustache', 'Goatee', 'Nose Ring', 'Kind Smile'
  ];

  // Family Genetics
  momProfile = signal<ParentProfile>({ 
      raceLabel: 'African American', 
      skinDescription: 'deep rich dark mahogany skin', 
      hairDescription: 'tightly coiled',
      bodyType: 'average build',
      hairColor: 'Black',
      eyeColor: 'Brown',
      clothingStyle: 'Casual (T-shirt/Jeans)',
      hairStyle: 'Afro',
      facialFeatures: 'Dimples'
  });
  dadProfile = signal<ParentProfile>({ 
      raceLabel: 'Caucasian', 
      skinDescription: 'fair beige skin', 
      hairDescription: 'straight',
      bodyType: 'average build',
      hairColor: 'Brown',
      eyeColor: 'Blue',
      clothingStyle: 'Athletic (Sporty)',
      hairStyle: 'Crew Cut',
      facialFeatures: 'Beard'
  });
  
  // Ad & Economy State
  coins = signal(50);
  inventory = signal<string[]>([]);
  equippedClothing = signal<string | null>(null);
  equippedToy = signal<string | null>(null);
  
  // Ad System
  adVisible = signal(false);
  adTimer = signal(0);
  adReward = signal(0);
  adMessageCounter = signal(0);
  adInterval: any;

  // UI Visibility
  showStore = signal(false);
  showMilestones = signal(false);
  showGames = signal(false);
  
  unlockThreshold = 10;
  isLoading = signal(false);
  isListening = this.speech.isListening;
  voiceEnabled = signal(true);
  canUnlockBoth = signal(false); 

  // Store Items (Expanded)
  storeItems: StoreItem[] = [
    // Food
    { id: 'apple', name: 'Apple', type: 'food', price: 5, icon: '🍎', description: 'Healthy!' },
    { id: 'banana', name: 'Nanna', type: 'food', price: 6, icon: '🍌', description: 'Potassium!' },
    { id: 'water', name: 'Wawa', type: 'food', price: 3, icon: '💧', description: 'Hydration!' },
    { id: 'cookie', name: 'Cookie', type: 'food', price: 10, icon: '🍪', description: 'Treat!' },
    { id: 'pizza', name: 'Pitha', type: 'food', price: 15, icon: '🍕', description: 'Yummy!' },
    { id: 'juice', name: 'Juice', type: 'food', price: 8, icon: '🧃', description: 'Sweet!' },
    
    // Clothing
    { id: 'hat_red', name: 'Red Cap', type: 'clothing', price: 50, icon: '🧢', description: 'Cool hat.' },
    { id: 'sunglasses', name: 'Shades', type: 'clothing', price: 30, icon: '🕶️', description: 'Cool.' },
    { id: 'raincoat', name: 'Raincoat', type: 'clothing', price: 75, icon: '🧥', description: 'Dry!' },
    { id: 'wintercoat', name: 'Puffy Coat', type: 'clothing', price: 80, icon: '🧣', description: 'Warm!' },
    { id: 'swimsuit', name: 'Swimmies', type: 'clothing', price: 60, icon: '🩳', description: 'Splash!' },
    { id: 'costume', name: 'Costume', type: 'clothing', price: 100, icon: '🦸', description: 'Hero!' },

    // Toys
    { id: 'ball_blue', name: 'Ball', type: 'toy', price: 20, icon: '🔵', description: 'Bounce!' },
    { id: 'teddy', name: 'Teddy', type: 'toy', price: 25, icon: '🧸', description: 'Hug!' },
    { id: 'truck', name: 'Truck', type: 'toy', price: 35, icon: '🚒', description: 'Beep!' },
    { id: 'drum', name: 'Drum', type: 'toy', price: 45, icon: '🥁', description: 'Bang!' },
    { id: 'crayons', name: 'Crayons', type: 'toy', price: 15, icon: '🖍️', description: 'Draw!' },
    { id: 'xylophone', name: 'Xylophone', type: 'toy', price: 50, icon: '🎹', description: 'Music!' },
  ];

  // Milestones
  milestones = signal<Milestone[]>([
    { id: 'first_word', title: 'First Chatter', description: 'Exchanged 10 messages.', unlocked: false, icon: '🗣️' },
    { id: 'best_friends', title: 'Best Friends', description: 'Unlocked "Both" mode.', unlocked: false, icon: '👯' },
    { id: 'fashionista', title: 'Fashionista', description: 'Bought first clothing item.', unlocked: false, icon: '🧢' },
    { id: 'musician', title: 'Musician', description: 'Played with a musical toy.', unlocked: false, icon: '🎵' },
    { id: 'tantrum_tamer', title: 'Tantrum Tamer', description: 'Survived a tantrum.', unlocked: false, icon: '🧘' },
    { id: 'gamer', title: 'Gamer', description: 'Played "Toddler Says".', unlocked: false, icon: '🎲' },
    { id: 'smartypants', title: 'Smartypants', description: 'Played a Learning Game.', unlocked: false, icon: '🎓' },
  ]);

  // Language Filter
  private badWords = ['fuck', 'shit', 'bitch', 'ass', 'damn', 'hell', 'crap', 'stupid', 'hate', 'kill', 'die', 'ugly'];

  constructor() {
    effect(() => {
      const msgs = this.messages();
      if (msgs.length > 0 && this.chatContainer) {
        setTimeout(() => {
          this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
        }, 100);
      }
    });

    const savedCount = localStorage.getItem('toddler_msg_count');
    if (savedCount) this.messageCount.set(parseInt(savedCount, 10));
    
    const savedCoins = localStorage.getItem('toddler_coins');
    if (savedCoins) this.coins.set(parseInt(savedCoins, 10));

    const savedInv = localStorage.getItem('toddler_inventory');
    if (savedInv) this.inventory.set(JSON.parse(savedInv));

    this.checkUnlockStatus();
    this.checkMilestones();
    this.randomizeFamily();
  }

  ngOnInit() {
    this.adInterval = setInterval(() => {
      if (this.stage() === 'chat' && !this.adVisible()) {
        this.triggerAd('random');
      }
    }, 5 * 60 * 1000);
  }

  ngOnDestroy() {
    if (this.adInterval) clearInterval(this.adInterval);
  }

  randomizeFamily() {
    // Definition of racial traits for generation
    const racialTraits = [
        { 
            label: 'African American', 
            skin: 'deep rich dark ebony skin tone', 
            hair: 'tightly coiled' 
        },
        { 
            label: 'Hispanic', 
            skin: 'warm tan olive skin tone', 
            hair: 'wavy' 
        },
        { 
            label: 'Caucasian', 
            skin: 'fair pale beige skin tone', 
            hair: 'straight' 
        },
        { 
            label: 'Asian', 
            skin: 'warm beige golden skin tone', 
            hair: 'straight' 
        }
    ];
    
    const bodyTypes = ['average athletic build', 'soft plus sized cuddly build'];
    const getRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    const trait1 = getRandom(racialTraits);
    const trait2 = getRandom(racialTraits);

    const p1: ParentProfile = { 
        raceLabel: trait1.label, 
        skinDescription: trait1.skin, 
        hairDescription: trait1.hair, 
        bodyType: getRandom(bodyTypes),
        hairColor: getRandom(this.hairColors),
        eyeColor: getRandom(this.eyeColors),
        clothingStyle: getRandom(this.clothingStyles),
        hairStyle: getRandom(this.hairStyles),
        facialFeatures: getRandom(this.facialFeatureOptions)
    };

    const p2: ParentProfile = { 
        raceLabel: trait2.label, 
        skinDescription: trait2.skin, 
        hairDescription: trait2.hair, 
        bodyType: getRandom(bodyTypes),
        hairColor: getRandom(this.hairColors),
        eyeColor: getRandom(this.eyeColors),
        clothingStyle: getRandom(this.clothingStyles),
        hairStyle: getRandom(this.hairStyles),
        facialFeatures: getRandom(this.facialFeatureOptions)
    };

    if (Math.random() > 0.5) {
      this.momProfile.set(p1);
      this.dadProfile.set(p2);
    } else {
      this.momProfile.set(p2);
      this.dadProfile.set(p1);
    }
  }

  getToddlerAppearance(child: 'Billy' | 'Sarah' | 'Both'): string {
    const mom = this.momProfile();
    const dad = this.dadProfile();
    const hairStyle = child === 'Billy' ? 'short curly fade' : 'curly double puffs with colorful beads';
    
    // Explicitly determine blended skin tone to ensure it's not washed out
    const skins = [mom.skinDescription, dad.skinDescription].join(' ');
    let skinTone = 'warm beige skin';

    if (skins.includes('ebony') && skins.includes('pale')) {
        skinTone = 'rich warm caramel brown skin';
    } else if (skins.includes('ebony') && (skins.includes('tan') || skins.includes('olive'))) {
        skinTone = 'deep rich bronze skin';
    } else if (skins.includes('ebony') && skins.includes('golden')) {
        skinTone = 'warm mocha brown skin';
    } else if (skins.includes('ebony') && skins.includes('ebony')) {
        skinTone = 'deep dark rich ebony skin';
    } else if (skins.includes('olive') && skins.includes('pale')) {
        skinTone = 'sun-kissed tan skin';
    } else if (skins.includes('olive')) {
        skinTone = 'warm olive skin';
    } else if (skins.includes('golden')) {
        skinTone = 'golden brown skin';
    }

    if (child === 'Both') {
         return `mixed race brother and sister twins, ${skinTone}, ${mom.raceLabel} and ${dad.raceLabel} features.`;
    }

    return `mixed race 2-year-old ${child === 'Billy' ? 'boy' : 'girl'}, ${skinTone}, ${hairStyle} ${dad.hairColor} hair. Detailed expressive face, ${mom.raceLabel} and ${dad.raceLabel} features.`;
  }

  containsProfanity(text: string): boolean {
      const lower = text.toLowerCase();
      return this.badWords.some(word => lower.includes(word));
  }

  checkUnlockStatus() {
    if (this.messageCount() >= this.unlockThreshold) {
      this.canUnlockBoth.set(true);
      this.unlockMilestone('best_friends');
    }
    if (this.messageCount() >= 10) {
      this.unlockMilestone('first_word');
    }
  }

  unlockMilestone(id: string) {
    this.milestones.update(ms => ms.map(m => {
      if (m.id === id && !m.unlocked) {
        this.sound.play('ding'); // Sound effect!
        // Could show a toast here
        return { ...m, unlocked: true };
      }
      return m;
    }));
  }

  checkMilestones() {
      // Check passive milestones
      if (this.inventory().some(id => ['hat_red', 'sunglasses', 'raincoat', 'wintercoat', 'swimsuit', 'costume'].includes(id))) {
          this.unlockMilestone('fashionista');
      }
  }

  // --- Ad System ---
  triggerAd(type: 'random' | 'rewarded') {
    const isRewarded = type === 'rewarded';
    const duration = isRewarded ? 15 : 5;
    const minReward = isRewarded ? 15 : 1;
    const maxReward = isRewarded ? 20 : 2;
    const reward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;

    this.adReward.set(reward);
    this.adTimer.set(duration);
    this.adVisible.set(true);

    const timer = setInterval(() => {
      this.adTimer.update(t => t - 1);
      if (this.adTimer() <= 0) {
        clearInterval(timer);
        this.completeAd();
      }
    }, 1000);
  }

  completeAd() {
    this.adVisible.set(false);
    this.addCoins(this.adReward());
    if (this.adReward() <= 5) this.adMessageCounter.set(0);
    this.sound.play('ding');
  }

  addCoins(amount: number) {
    this.coins.update(c => c + amount);
    localStorage.setItem('toddler_coins', this.coins().toString());
  }

  // --- Store & Inventory ---
  toggleStore() { this.showStore.update(v => !v); }
  toggleMilestones() { this.showMilestones.update(v => !v); }
  toggleGames() { this.showGames.update(v => !v); }

  triggerGame(gameType: string) {
      this.currentGame.set(gameType);
      this.showGames.set(false);
      this.unlockMilestone('smartypants');
      const intro = gameType === 'Colors' ? "Let's learn colors! What color is the Apple?" 
                  : gameType === 'Shapes' ? "Let's find shapes! Do you see a Circle?" 
                  : "Let's count! One, Two...";
      
      this.messages.update(msgs => [...msgs, { role: 'user', text: `[GAME START: ${gameType}] ${intro}` }]);
      
      // Let the bot respond immediately to the game start
      setTimeout(() => this.sendMessage('', `[System: Child reacts to ${gameType} game]`), 100);
  }

  buyItem(item: StoreItem) {
    if (this.coins() >= item.price) {
      this.coins.update(c => c - item.price);
      localStorage.setItem('toddler_coins', this.coins().toString());
      this.sound.play('pop');
      
      if (item.type === 'food') {
        this.showStore.set(false);
        this.sendMessage(`I have a ${item.name} for you!`, `*gives ${item.name}*`);
      } else {
        if (!this.inventory().includes(item.id)) {
           this.inventory.update(inv => [...inv, item.id]);
           localStorage.setItem('toddler_inventory', JSON.stringify(this.inventory()));
        }
        if (item.type === 'clothing') this.equippedClothing.set(item.name);
        if (item.type === 'toy') {
            this.equippedToy.set(item.name);
            if (['drum', 'xylophone'].includes(item.id)) this.unlockMilestone('musician');
        }
        this.showStore.set(false);
        this.sendMessage(`Look at your new ${item.name}!`, `*gives new ${item.name}*`);
        this.checkMilestones();
      }
    } else {
      alert("Not enough coins! Watch an ad?");
    }
  }

  isOwned(itemId: string): boolean {
    return this.inventory().includes(itemId);
  }

  // --- Core App Logic ---
  selectParent(role: Parent) {
    this.parentRole.set(role);
    this.stage.set('setup-child');
  }

  selectChild(child: Child) {
    this.selectedChild.set(child);
    this.stage.set('chat');
    this.currentMood.set('happy'); 
    this.adMessageCounter.set(0);
    this.currentGame.set(null);
    
    setTimeout(() => {
        this.receiveGreeting();
    }, 500);
  }

  resetApp() {
    this.stage.set('setup-parent');
    this.messages.set([]);
    this.currentMood.set('happy');
    this.randomizeFamily();
    this.currentGame.set(null);
  }

  toggleVoice() { this.voiceEnabled.update(v => !v); }

  async startListening() {
    try {
      const text = await this.speech.listen();
      this.sendMessage(text);
    } catch (err) {
      console.error('Speech error:', err);
      alert('Could not hear you! Try typing.');
    }
  }

  async sendMessage(text: string, contextAction?: string) {
    if ((!text.trim() && !contextAction) || this.isLoading()) return;

    // LANGUAGE FILTER CHECK
    if (this.containsProfanity(text)) {
        this.messages.update(msgs => [...msgs, { role: 'user', text: '*** [Language Filtered] ***' }]);
        // Toddler response to bad language
        setTimeout(() => {
            const botMsg: ChatMessage = {
                role: 'model',
                text: 'No say bad words! 🥺',
                activity: 'covering ears looking sad'
            };
            this.messages.update(msgs => [...msgs, botMsg]);
            
            // Image of sadness
            const sc = this.selectedChild();
            const appearance = this.getToddlerAppearance(sc);
             this.gemini.generateToddlerImage(sc === 'Both' ? 'Both' : sc, 'covering ears sad', 'sad', appearance).then(url => {
                this.messages.update(msgs => {
                     const newMsgs = [...msgs];
                     const target = newMsgs.find(m => m === botMsg);
                     if (target) target.image = url;
                     return newMsgs;
                });
             });
        }, 500);
        return;
    }

    const fullMessage = contextAction ? `${contextAction} ${text}` : text;
    
    // Game Check: Toddler Says
    if (fullMessage.toLowerCase().includes('toddler says')) {
        this.unlockMilestone('gamer');
    }

    // Ad Logic
    this.adMessageCounter.update(c => c + 1);
    if (this.adMessageCounter() >= 10) {
      this.triggerAd('random');
      this.adMessageCounter.set(0);
      return; 
    }

    this.messageCount.update(c => c + 1);
    localStorage.setItem('toddler_msg_count', this.messageCount().toString());
    this.checkUnlockStatus();

    this.messages.update(msgs => [...msgs, { role: 'user', text: fullMessage }]);
    this.isLoading.set(true);

    // Mood Rng
    if (this.currentMood() === 'happy') {
      const rand = Math.random();
      if (rand < 0.05) this.currentMood.set('tantrum');
      else if (rand < 0.15) this.currentMood.set('grumpy');
    }

    // Determine Responder
    const currentChild = this.selectedChild();
    let respondingChildName = currentChild; // 'Billy', 'Sarah', or 'Both'

    // Prepare history
    const history = this.messages().map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
    }));

    const response = await this.gemini.generateChildResponse(
      fullMessage, 
      history, 
      respondingChildName, 
      this.parentRole(),
      this.currentMood(),
      this.currentGame()
    );
    
    // Mood Update
    const newEmotion = response.emotion?.toLowerCase() || '';
    if (newEmotion.includes('happy') || newEmotion.includes('excited')) {
      if (this.currentMood() !== 'happy') this.addCoins(5);
      else if (Math.random() > 0.7) this.addCoins(1);
      this.currentMood.set('happy');
      this.sound.play('giggle'); // Happy sound
    } else if (newEmotion.includes('tantrum') || newEmotion.includes('cry')) {
      this.currentMood.set('tantrum');
      this.unlockMilestone('tantrum_tamer');
      this.sound.play('cry'); // Crying sound
    } else if (newEmotion.includes('grumpy')) {
      this.currentMood.set('grumpy');
    }

    // Check if playing
    if (response.activityDescription.toLowerCase().includes('playing') || response.activityDescription.toLowerCase().includes('ball')) {
        this.sound.play('play');
    }

    const botMsg: ChatMessage = {
      role: 'model',
      text: response.text,
      activity: response.activityDescription
    };

    this.messages.update(msgs => [...msgs, botMsg]);
    this.isLoading.set(false);

    if (this.voiceEnabled()) {
        const pitch = currentChild === 'Billy' ? 1.3 : 1.5;
        this.speech.speak(response.text, pitch);
    }

    if (response.activityDescription) {
       let extras = '';
       if (this.equippedClothing()) extras += `wearing ${this.equippedClothing()}, `;
       if (this.equippedToy()) extras += `playing with ${this.equippedToy()}, `;

       const appearance = this.getToddlerAppearance(currentChild);
       
       const imageUrl = await this.gemini.generateToddlerImage(
         currentChild, 
         response.activityDescription,
         this.currentMood(),
         appearance,
         extras
       );
       
       this.messages.update(msgs => {
         const newMsgs = [...msgs];
         const lastMsg = newMsgs[newMsgs.length - 1];
         if (lastMsg === botMsg) lastMsg.image = imageUrl;
         return newMsgs;
       });
    }
  }
  
  receiveGreeting() {
      const sc = this.selectedChild();
      const greeting = sc === 'Billy' ? 'Hewo! Pway twuck?' : sc === 'Sarah' ? 'Hewo! Want juju?' : 'Hewo! We pway!';
      
      const botMsg: ChatMessage = {
          role: 'model',
          text: greeting,
          activity: 'Standing and waving'
      };
      this.messages.update(msgs => [...msgs, botMsg]);
      
      if (this.voiceEnabled()) {
          this.speech.speak(greeting, sc === 'Billy' ? 1.3 : 1.5);
      }
      this.sound.play('giggle');

      const appearance = this.getToddlerAppearance(sc);
      this.gemini.generateToddlerImage(sc, 'waving hello happy', 'happy', appearance).then(url => {
          this.messages.update(msgs => {
             const newMsgs = [...msgs];
             const target = newMsgs.find(m => m === botMsg);
             if (target) target.image = url;
             return newMsgs;
          });
      });
  }

  getMoodEmoji(): string {
    switch (this.currentMood()) {
      case 'happy': return '😊';
      case 'grumpy': return '😒';
      case 'tantrum': return '🤬';
      default: return '😐';
    }
  }
}