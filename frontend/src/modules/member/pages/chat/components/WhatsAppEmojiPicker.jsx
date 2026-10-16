import React, { useState, useMemo } from 'react';
import { Smile, Heart, Users, Trees, Coffee, Trophy, Car, Flag } from 'lucide-react';

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

/**
 * WhatsApp-style emoji panel: shown in place of the keyboard, below the message box.
 * Big emojis without highlight circles; the category bar sits at the bottom.
 */
export const WhatsAppEmojiPicker = ({ onSelectEmoji }) => {
  const [activeCategory, setActiveCategory] = useState('smileys');

  const currentCategoryObj = useMemo(() => {
    return EMOJI_CATEGORIES.find(c => c.id === activeCategory) || EMOJI_CATEGORIES[0];
  }, [activeCategory]);

  return (
    <div
      className="w-full bg-white border-t border-slate-200 flex flex-col"
      style={{ height: '290px', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.preventDefault()} // keep the keyboard closed while picking
    >
      {/* Emoji grid */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-2 pt-2">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1.5 mb-1">
          {currentCategoryObj.name}
        </p>
        <div className="grid grid-cols-7 sm:grid-cols-9">
          {currentCategoryObj.emojis.map((emoji, idx) => (
            <button
              key={`${emoji}-${idx}`}
              type="button"
              onClick={() => onSelectEmoji(emoji)}
              className="h-12 flex items-center justify-center text-[30px] leading-none bg-transparent active:scale-90 transition-transform select-none"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Category bar */}
      <div className="flex items-center justify-around border-t border-slate-100 px-1 py-1.5 shrink-0">
        {EMOJI_CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`p-2 flex items-center justify-center transition-colors border-b-2 ${
                isActive ? 'text-purple-600 border-purple-600' : 'text-slate-400 border-transparent'
              }`}
              title={cat.name}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WhatsAppEmojiPicker;
