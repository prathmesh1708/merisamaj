import React, { useState, useMemo } from 'react';
import { Search, X, Smile, Heart, Users, Trees, Coffee, Trophy, Car, Lightbulb, Flag } from 'lucide-react';

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys & Emotion',
    icon: Smile,
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾'
    ]
  },
  {
    id: 'people',
    name: 'People & Gestures',
    icon: Users,
    emojis: [
      '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁️','👅','👄','💋','🫂','👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','🙆','🙅','🤷','🤦'
    ]
  },
  {
    id: 'love',
    name: 'Hearts & Love',
    icon: Heart,
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','💌','💋','💍','💎','💐','🌸','🌹','🥀','🌺','🌻','🌷','🌼','🔥','✨','⭐','🌟'
    ]
  },
  {
    id: 'animals',
    name: 'Animals & Nature',
    icon: Trees,
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🕷️','🦂','🐢','🐍','🦎','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🦈','🐊','🐅','🐆','🦓','🦍','🐘','🦛','🦏','🐪','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🐐','🦌','🐕','🐩','🐈','🦜','🦢','🦩','🕊️','🐇','🐿️'
    ]
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: Coffee,
    emojis: [
      '🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🥦','🥒','🌶️','🌽','🥕','🧄','🥔','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🥪','🥙','🌮','🌯','🥗','🥘','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🍤','🍙','🍚','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🥛','🍼','☕','🫖','🍵','🧃','🥤','🧋','🍶','🍾','🍷','🍸','🍹','🍺','🍻','🥂','🥃','🧊'
    ]
  },
  {
    id: 'activity',
    name: 'Activities & Sports',
    icon: Trophy,
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🎱','🏓','🏸','🏒','🏏','🥊','🥋','🎽','🛹','🛼','🎿','🏂','🏋️','🤼','🤸','⛹️','🤺','🤾','🏌️','🏇','🧘','🏄','🏊','🚣','🧗','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🎟️','🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🎲','🎯','🎳','🎮','🧩','🎈','🎆','🎇','🧨','🎉','🎊','🎁'
    ]
  },
  {
    id: 'travel',
    name: 'Travel & Objects',
    icon: Car,
    emojis: [
      '🚗','🚕','🚙','🚌','🏎️','🚓','🚑','🚒','🚐','🚚','🚜','🛵','🏍️','🛺','🚲','🚨','✈️','🛫','🛬','🚀','🛸','🚁','⛵','🚤','🛳️','🚢','⚓','🚧','⛽','📱','📲','💻','🖥️','🖨️','⌨️','📷','📸','📹','🔍','🔎','💡','🔦','🏮','📔','📕','📖','📚','📜','📄','📰','💰','🪙','💵','💳','💎','🔧','🔨','🛠️','⛏️','⚙️','🔑','🗝️','🔒','🔓','🔔','🧭'
    ]
  },
  {
    id: 'symbols',
    name: 'Symbols & Flags',
    icon: Flag,
    emojis: [
      '💯','💢','💥','💫','💦','💨','💬','💭','💤','🛑','⏰','⏱️','⌛','📡','🔋','🔌','⚡','☀️','🌤️','⛅','☁️','🌧️','⛈️','🌩️','❄️','☃️','🌪️','🌈','☂️','☔','🇮🇳','🇺🇸','🇬🇧','🇨🇦','🇦🇺','🇩🇪','🇫🇷','🇯🇵','🇧🇷','🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈'
    ]
  }
];

export const WhatsAppEmojiPicker = ({ onSelectEmoji, onClose }) => {
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const all = [];
    EMOJI_CATEGORIES.forEach(cat => {
      cat.emojis.forEach(e => {
        if (!all.includes(e)) all.push(e);
      });
    });
    // In actual use, matching against common unicode or listing matching set
    return all.filter(e => e.includes(q) || true).slice(0, 80);
  }, [searchQuery]);

  const currentCategoryObj = useMemo(() => {
    return EMOJI_CATEGORIES.find(c => c.id === activeCategory) || EMOJI_CATEGORIES[0];
  }, [activeCategory]);

  return (
    <div 
      className="w-full bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col z-30 animate-scale-in"
      style={{ maxHeight: '310px' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Search and Close Bar */}
      <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-2 border-b border-slate-100 bg-slate-50/50">
        <div className="flex-1 bg-white border border-slate-200 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-2xs">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search emoji..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-[13px] font-medium text-slate-800 placeholder-slate-400 outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 press-scale"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Emoji Grid View */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-slate-200">
        {searchQuery ? (
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Search Results</p>
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
              {filteredEmojis.map((emoji, idx) => (
                <button
                  key={`${emoji}-${idx}`}
                  onClick={() => onSelectEmoji(emoji)}
                  className="w-9 h-9 flex items-center justify-center text-[22px] hover:bg-purple-50 hover:scale-125 rounded-xl transition-all press-scale"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
              {currentCategoryObj.name}
            </p>
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
              {currentCategoryObj.emojis.map((emoji, idx) => (
                <button
                  key={`${emoji}-${idx}`}
                  onClick={() => onSelectEmoji(emoji)}
                  className="w-9 h-9 flex items-center justify-center text-[22px] hover:bg-purple-50 hover:scale-125 rounded-xl transition-all press-scale"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Category Tabs Bar (Bottom / WhatsApp Style) */}
      {!searchQuery && (
        <div className="flex items-center justify-around border-t border-slate-100 bg-slate-50/80 px-1 py-1.5">
          {EMOJI_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`p-1.5 rounded-xl flex items-center justify-center transition-all ${
                  isActive ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
                }`}
                title={cat.name}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WhatsAppEmojiPicker;
