import { useState, useEffect, useRef } from 'react';
import lecturesData from './data/lectures.json';
import questionsData from './data/questions.json';

function App() {
  // Passcode Protection
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('sk_auth') === 'true';
  });
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  const handleAuthenticate = (e) => {
    e.preventDefault();
    if (passcodeInput.trim() === 'uposie') {
      setIsAuthenticated(true);
      localStorage.setItem('sk_auth', 'true');
      setPasscodeError('');
    } else {
      setPasscodeError('Niepoprawne hasło. Spróbuj ponownie.');
    }
  };

  // Main Tabs State
  const [activeTab, setActiveTab] = useState('theory');

  // Stats State
  const [rememberedCards, setRememberedCards] = useState(() => {
    const saved = localStorage.getItem('remembered_cards');
    return saved ? JSON.parse(saved) : [];
  });
  const [forgottenCards, setForgottenCards] = useState(() => {
    const saved = localStorage.getItem('forgotten_cards');
    return saved ? JSON.parse(saved) : [];
  });
  const [testStats, setTestStats] = useState(() => {
    const saved = localStorage.getItem('test_stats');
    return saved ? JSON.parse(saved) : { count: 0, totalScore: 0, maxScore: 0 };
  });
  const [studyTime, setStudyTime] = useState(() => {
    const saved = localStorage.getItem('study_time');
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem('remembered_cards', JSON.stringify(rememberedCards));
  }, [rememberedCards]);

  useEffect(() => {
    localStorage.setItem('forgotten_cards', JSON.stringify(forgottenCards));
  }, [forgottenCards]);

  useEffect(() => {
    localStorage.setItem('test_stats', JSON.stringify(testStats));
  }, [testStats]);

  // Track study time (simple interval)
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      setStudyTime(prev => {
        const next = prev + 1;
        localStorage.setItem('study_time', next.toString());
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Format time (seconds to MM:SS or HH:MM:SS)
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    }
    return `${m}m ${s}s`;
  };

  // ==========================================
  // THEORY TAB (Wykłady)
  // ==========================================
  const [selectedLecture, setSelectedLecture] = useState(lecturesData[0]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slideSearchQuery, setSlideSearchQuery] = useState('');

  const [slideQuizQuestion, setSlideQuizQuestion] = useState(null);
  const [slideQuizSelected, setSlideQuizSelected] = useState('');
  const [slideQuizSubmitted, setSlideQuizSubmitted] = useState(false);

  const handleCopyText = (text, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    const originalText = e.target.innerText;
    e.target.innerText = 'Skopiowano!';
    setTimeout(() => {
      e.target.innerText = originalText;
    }, 2000);
  };

  const getRelatedQuestionForSlide = (lectureId, slideIndex, slideText) => {
    let pool = questionsData.filter(q => q.type === 'choice');
    const keywords = {
      w1: ['osi', 'iso', 'ethernet', 'ipv4', 'arp', 'arpanet', 'preambuła', 'ramka', 'mac'],
      w2: ['switch', 'hub', 'vlan', 'stp', 'spanning tree', 'bridge', 'kolizyjna', 'rozgłoszeniowa', 'bpdu'],
      w3: ['maska', 'podsieć', 'cidr', 'vlsm', 'icmp', 'ping', 'tracert', 'traceroute'],
      w4: ['tcp', 'udp', 'tftp', 'port', 'gniazdo', 'socket', 'syn', 'ack', 'fin', 'rst', 'window', 'handshake'],
      w5: ['dns', 'rekord', 'cname', 'mx', 'ptr', 'aaaa', 'resolv.conf', 'bind', 'soa'],
      w6: ['ipv6', 'routing', 'rip', 'wektor odległości', 'split horizon', 'link-local'],
      w7: ['ospf', 'bgp', 'dijkstra', 'lsa', 'abr', 'asbr', 'dr', 'stan łącza']
    }[lectureId] || [];

    let matchingQuestions = pool.filter(q => {
      const qText = q.text.toLowerCase();
      return keywords.some(kw => qText.includes(kw));
    });

    if (matchingQuestions.length === 0) {
      matchingQuestions = pool;
    }

    const seed = (lectureId.charCodeAt(1) || 0) + slideIndex;
    const index = seed % matchingQuestions.length;
    return matchingQuestions[index];
  };

  const getExplanationForQuestion = (q, selected) => {
    if (q.explanation) return q.explanation;
    const correctOpt = q.options.find(o => o.letter === q.answer);
    const text = q.text.toLowerCase();
    
    if (text.includes('osi') || text.includes('iso')) {
      return `Model ISO/OSI składa się z 7 warstw (Fizyczna, Łącza danych, Sieciowa, Transportowa, Sesji, Prezentacji, Aplikacji). Enkapsulacja przypisuje konkretne jednostki danych (PDU) do warstw: ramki w warstwie 2, pakiety/datagramy w warstwie 3, segmenty TCP lub datagramy UDP w warstwie 4.`;
    }
    if (text.includes('arp')) {
      return `Protokół ARP (Address Resolution Protocol) służy do mapowania logicznych adresów IP (warstwa 3) na fizyczne adresy sprzętowe MAC (warstwa 2) w sieci lokalnej przy użyciu rozgłoszeń (broadcast). Odwrotne mapowanie (z MAC na IP) realizuje RARP lub DHCP.`;
    }
    if (text.includes('ethernet') || text.includes('ramk')) {
      return `Ramka Ethernet standardu IEEE 802.3 musi mieć rozmiar od 64 do 1518 bajtów (oktetów). Każda ramka mniejsza niż 64 bajty jest traktowana jako runt frame (słaba ramka powstała np. z kolizji w CSMA/CD) i odrzucana przez odbiorcę. Preambuła (7+1 bajtów ze znacznikiem SFD) służy do synchronizacji zegara odbiorcy.`;
    }
    if (text.includes('vlan') || text.includes('802.1q')) {
      return `Sieci wirtualne VLAN (IEEE 802.1Q) pozwalają na logiczny podział jednej fizycznej sieci LAN na wiele odizolowanych domen rozgłoszeniowych. Tagowanie (dodanie 4-bajtowego pola z VLAN ID o wielkości 12 bitów - stąd max 4096 VLAN-ów) odbywa się na łączach typu trunk.`;
    }
    if (text.includes('stp') || text.includes('spanning tree') || text.includes('bpdu')) {
      return `Protokół STP (Spanning Tree Protocol, IEEE 802.1D) eliminuje pętle w topologiach nadmiarowych mostów/przełączników poprzez blokowanie wybranych portów (Blocking state). Wymiana ramek BPDU decyduje o wyborze Root Bridge (mostu głównego o najniższym ID/priorytecie) oraz wyznaczeniu portów głównych (Root Ports) i desygnowanych (Designated Ports).`;
    }
    if (text.includes('mask') || text.includes('podsieć') || text.includes('cidr') || text.includes('vlsm')) {
      return `Maska podsieci (lub prefiks CIDR) wyznacza granicę między częścią sieciową a częścią hosta w adresie IP. Przy podziale podsieci zawsze odejmujemy 2 adresy: adres sieci (same zera w części hosta) oraz adres rozgłoszeniowy (same jedynki w części hosta). VLSM pozwala na stosowanie różnych masek w zależności od potrzeb danej podsieci.`;
    }
    if (text.includes('tcp') || text.includes('syn') || text.includes('ack') || text.includes('rst') || text.includes('fin')) {
      return `Protokół TCP jest połączeniowy i niezawodny (warstwa transportowa). Korzysta z trójetapowego nawiązywania połączenia (SYN -> SYN-ACK -> ACK). Flaga RST natychmiastowo zrywa połączenie w przypadku błędów, PSH wymusza przesłanie danych bez buforowania, a FIN rozpoczyna łagodne zamykanie połączenia. Kontrola przepływu bazuje na dynamicznym oknie (Window Size).`;
    }
    if (text.includes('udp') || text.includes('tftp')) {
      return `Protokół UDP jest bezpołączeniowy i zawodny, ale szybszy od TCP z racji mniejszego nagłówka (8 bajtów). TFTP działa na porcie 69 UDP i przesyła pliki w blokach 512-bajtowych, czekając na potwierdzenie każdego bloku (stop-and-wait).`;
    }
    if (text.includes('dns') || text.includes('rekord') || text.includes('mx') || text.includes('cname') || text.includes('ptr')) {
      return `System DNS tłumaczy nazwy domenowe na adresy IP. Rekord A mapuje domenę na IPv4, AAAA na IPv6, CNAME tworzy alias (nazwę kanoniczną), MX wskazuje serwer pocztowy (z priorytetem), PTR realizuje mapowanie wsteczne (IP na nazwę w strefie in-addr.arpa), a SOA zawiera parametry autorytatywne strefy.`;
    }
    if (text.includes('ipv6') || text.includes('link-local') || text.includes('fe80')) {
      return `Adres IPv6 ma długość 128 bitów (16 bajtów) i zapisywany jest szesnastkowo. W IPv6 nie ma adresów typu broadcast (zastąpione przez multicast). Adresy Link-Local (zaczynające się od fe80::/10) pozwalają na komunikację w obrębie tego samego fizycznego łącza bez routera czy serwera DHCP.`;
    }
    if (text.includes('rip') || text.includes('wektor odległości') || text.includes('split horizon')) {
      return `Protokół RIPv2 (port 521 UDP) to protokół IGP typu wektor odległości. Jako metrykę stosuje liczbę skoków (Hop Count) z limitem 15 (16 oznacza sieć nieosiągalną). Mechanizmy takie jak Split Horizon (podzielony horyzont) zapobiegają pętlom routingu poprzez nieodsyłanie tras tą samą drogą, którą zostały odebrane.`;
    }
    if (text.includes('ospf') || text.includes('stan łącza') || text.includes('lsa') || text.includes('dijkstra')) {
      return `OSPF to protokół IGP typu stan łącza (link-state) bazujący na algorytmie Dijkstry (SPF) do wyznaczania najkrótszych ścieżek. Wszyscy uczestnicy wymieniają komunikaty LSA, budując identyczną bazę topologii (LSDB). OSPF dzieli sieć na obszary, gdzie Area 0 to szkielet (Backbone Area), do którego podłączone są inne obszary za pomocą routerów ABR.`;
    }

    if (correctOpt) {
      return `Poprawna odpowiedź to "${correctOpt.text}". Została ona wyznaczona zgodnie z teorią sieci komputerowych.`;
    }
    return `Poprawna odpowiedź to ${q.answer.toUpperCase()}.`;
  };

  useEffect(() => {
    if (selectedLecture && selectedLecture.slides && selectedLecture.slides[currentSlideIndex]) {
      const q = getRelatedQuestionForSlide(selectedLecture.id, currentSlideIndex, selectedLecture.slides[currentSlideIndex]);
      setSlideQuizQuestion(q);
    } else {
      setSlideQuizQuestion(null);
    }
    setSlideQuizSelected('');
    setSlideQuizSubmitted(false);
  }, [selectedLecture.id, currentSlideIndex]);

  const nextSlide = () => {
    if (currentSlideIndex < selectedLecture.slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const selectLecture = (lec) => {
    setSelectedLecture(lec);
    setCurrentSlideIndex(0);
  };

  // Highlight matches in slide text
  const renderHighlightedText = (text, highlight) => {
    if (!highlight.trim()) return text;
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="highlight">{part}</mark> : part
    );
  };

  const renderHighlightedTextForNode = (node, highlight) => {
    if (!highlight.trim()) return node;
    if (typeof node === 'string') {
      return renderHighlightedText(node, highlight);
    }
    if (Array.isArray(node)) {
      return node.map((child, i) => (
        <span key={i}>{renderHighlightedTextForNode(child, highlight)}</span>
      ));
    }
    if (node && node.props && node.props.children) {
      return {
        ...node,
        props: {
          ...node.props,
          children: renderHighlightedTextForNode(node.props.children, highlight)
        }
      };
    }
    return node;
  };

  const formatSlideLine = (line) => {
    let content = line.trim();
    if (!content) return null;

    const isBullet = content.startsWith('·') || content.startsWith('•') || content.startsWith('▪') || content.startsWith('-') || content.startsWith('*') || content.startsWith('o ');
    if (isBullet) {
      content = content.replace(/^([·•▪\-*]|o\s)\s*/, '');
    }

    const parts = [];
    let lastIdx = 0;
    const regex = /(\*\*.*?\*\*|`.*?`|\b(?:arp|ifconfig|ping|nslookup|traceroute|tracert|route|iptables|netstat|tcpdump|resolv\.conf|dhcpd\.conf|dhcpd|ifconfig)\b)/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const idx = match.index;
      if (idx > lastIdx) {
        parts.push(content.substring(lastIdx, idx));
      }
      
      const matchedText = match[0];
      if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
        parts.push(<strong key={idx} style={{ color: '#fff', fontWeight: '600' }}>{matchedText.slice(2, -2)}</strong>);
      } else if (matchedText.startsWith('`') && matchedText.endsWith('`')) {
        parts.push(<code key={idx} style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.9em', color: 'var(--accent-cyan)' }}>{matchedText.slice(1, -1)}</code>);
      } else {
        parts.push(<code key={idx} style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.9em', color: 'var(--accent-cyan)' }}>{matchedText}</code>);
      }
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < content.length) {
      parts.push(content.substring(lastIdx));
    }

    const finalContent = parts.length > 0 ? parts : content;

    return {
      isBullet,
      content: finalContent
    };
  };

  const parseSlideContent = (slideText) => {
    const lines = slideText.split('\n');
    const blocks = [];
    let currentBlock = null;

    const isBulletLine = (line) => {
      const trimmed = line.trim();
      return trimmed.startsWith('·') || trimmed.startsWith('•') || trimmed.startsWith('▪') || trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('o ');
    };

    const isCommandLine = (line) => {
      const trimmed = line.trim();
      return trimmed.startsWith('$ ') || trimmed.startsWith('# ') || trimmed.startsWith('C:\\') || trimmed.startsWith('arp -') || trimmed.startsWith('arpwatch') || trimmed.startsWith('tracert ') || trimmed.startsWith('traceroute ');
    };

    lines.forEach((line, idx) => {
      const cleanLine = line.trim();
      if (!cleanLine) {
        if (currentBlock) {
          blocks.push(currentBlock);
          currentBlock = null;
        }
        return;
      }

      if (idx === 0 && !isBulletLine(cleanLine) && cleanLine.length < 80) {
        if (currentBlock) blocks.push(currentBlock);
        blocks.push({ type: 'header', content: cleanLine });
        currentBlock = null;
        return;
      }

      if (isCommandLine(cleanLine)) {
        if (currentBlock && currentBlock.type !== 'terminal') {
          blocks.push(currentBlock);
          currentBlock = null;
        }
        if (!currentBlock) {
          currentBlock = { type: 'terminal', lines: [] };
        }
        currentBlock.lines.push(cleanLine);
      } else if (isBulletLine(cleanLine)) {
        if (currentBlock && currentBlock.type !== 'list') {
          blocks.push(currentBlock);
          currentBlock = null;
        }
        if (!currentBlock) {
          currentBlock = { type: 'list', items: [] };
        }
        currentBlock.items.push(cleanLine.replace(/^([·•▪\-*]|o\s)\s*/, ''));
      } else {
        if (currentBlock && currentBlock.type !== 'paragraph') {
          blocks.push(currentBlock);
          currentBlock = null;
        }
        if (!currentBlock) {
          currentBlock = { type: 'paragraph', lines: [] };
        }
        currentBlock.lines.push(cleanLine);
      }
    });

    if (currentBlock) {
      blocks.push(currentBlock);
    }

    return blocks;
  };

  const renderSlide = (slideText, searchHighlight) => {
    const blocks = parseSlideContent(slideText);
    const elements = [];

    const renderBlock = (block, bIdx) => {
      if (block.type === 'header') {
        return (
          <h4 key={bIdx} className="title-gradient" style={{ fontSize: '1.4rem', fontWeight: '600', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px', textAlign: 'left' }}>
            {block.content}
          </h4>
        );
      }

      if (block.type === 'terminal') {
        const codeText = block.lines.join('\n');
        return (
          <div className="terminal-window" key={bIdx} style={{ margin: '20px 0' }}>
            <div className="terminal-header">
              <div className="terminal-dots">
                <span className="terminal-dot red"></span>
                <span className="terminal-dot yellow"></span>
                <span className="terminal-dot green"></span>
              </div>
              <span className="terminal-title">Konsola</span>
              <button className="terminal-copy-btn" onClick={(e) => handleCopyText(codeText, e)}>
                Kopiuj
              </button>
            </div>
            <div className="terminal-body" style={{ background: '#0a0b12', padding: '14px 18px', borderTop: 'none', color: '#38bdf8' }}>
              {renderHighlightedTextForNode(codeText, searchHighlight)}
            </div>
          </div>
        );
      }

      if (block.type === 'list') {
        return (
          <ul key={bIdx} style={{ margin: '16px 0 16px 8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {block.items.map((item, lIdx) => {
              const parsed = formatSlideLine(item);
              return (
                <li key={lIdx} style={{ color: '#d1d5db', fontSize: '1.05rem', lineHeight: '1.6', listStyleType: 'none', paddingLeft: '24px', position: 'relative', textAlign: 'left' }}>
                  <span style={{ position: 'absolute', left: 0, top: '2px', color: 'var(--accent-cyan)' }}>▸</span>
                  {renderHighlightedTextForNode(parsed.content, searchHighlight)}
                </li>
              );
            })}
          </ul>
        );
      }

      if (block.type === 'paragraph') {
        return (
          <div key={bIdx} style={{ margin: '14px 0' }}>
            {block.lines.map((line, pIdx) => {
              const parsed = formatSlideLine(line);
              return (
                <p key={pIdx} style={{ margin: '10px 0', color: '#d1d5db', fontSize: '1.05rem', lineHeight: '1.6', textAlign: 'left' }}>
                  {renderHighlightedTextForNode(parsed.content, searchHighlight)}
                </p>
              );
            })}
          </div>
        );
      }

      return null;
    };

    blocks.forEach((block, bIdx) => {
      elements.push(renderBlock(block, bIdx));
    });

    return <div className="slide-html-content" style={{ textAlign: 'left' }}>{elements}</div>;
  };

  // ==========================================
  // FLASHCARDS TAB (Fiszki)
  // ==========================================
  const [cardFilter, setCardFilter] = useState('all'); // 'all' | 'forgotten' | '24_25' | '23_24'
  const [filteredCards, setFilteredCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Apply card filtering
  useEffect(() => {
    let result = [...questionsData];
    if (cardFilter === 'forgotten') {
      result = result.filter(q => forgottenCards.includes(q.id));
    } else if (cardFilter === '24_25') {
      result = result.filter(q => q.year === '2024/2025');
    } else if (cardFilter === '23_24') {
      result = result.filter(q => q.year === '2023/2024');
    }
    setFilteredCards(result);
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
  }, [cardFilter, forgottenCards]);

  const handleCardKnow = (cardId) => {
    // Add to remembered list
    if (!rememberedCards.includes(cardId)) {
      setRememberedCards(prev => [...prev, cardId]);
    }
    // Remove from forgotten list
    setForgottenCards(prev => prev.filter(id => id !== cardId));
    goToNextCard();
  };

  const handleCardForgot = (cardId) => {
    // Add to forgotten list
    if (!forgottenCards.includes(cardId)) {
      setForgottenCards(prev => [...prev, cardId]);
    }
    // Remove from remembered list
    setRememberedCards(prev => prev.filter(id => id !== cardId));
    goToNextCard();
  };

  const goToNextCard = () => {
    setIsCardFlipped(false);
    setTimeout(() => {
      if (currentCardIndex < filteredCards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
      } else {
        // Wrap around to start
        setCurrentCardIndex(0);
      }
    }, 200);
  };

  const renderFlashcardAnswer = (card) => {
    if (card.type === 'choice') {
      const correctOpt = card.options.find(o => o.letter === card.answer);
      return (
        <div>
          <p style={{ color: 'var(--accent-cyan)', fontWeight: '600', marginBottom: '12px' }}>
            Odpowiedź: ({card.answer.toUpperCase()})
          </p>
          <p style={{ fontSize: '1.1rem' }}>{correctOpt ? correctOpt.text : card.answer}</p>
        </div>
      );
    } else if (card.type === 'yes_no') {
      return (
        <div style={{ textAlign: 'left', width: '100%' }}>
          <p style={{ color: 'var(--accent-cyan)', fontWeight: '600', marginBottom: '8px', textAlign: 'center' }}>
            Odpowiedzi (Prawda/Fałsz):
          </p>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {card.subQuestions.map((sub, idx) => (
              <li key={idx} style={{ fontSize: '0.95rem', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px' }}>
                <strong style={{ textTransform: 'uppercase' }}>{sub.letter || idx + 1})</strong> {sub.text}: <strong style={{ color: sub.answer === 'tak' ? '#10b981' : '#ef4444' }}>{sub.answer === 'tak' ? 'TAK' : 'NIE'}</strong>
              </li>
            ))}
          </ul>
        </div>
      );
    } else if (card.type === 'matching') {
      return (
        <div style={{ textAlign: 'left', width: '100%' }}>
          <p style={{ color: 'var(--accent-cyan)', fontWeight: '600', marginBottom: '8px', textAlign: 'center' }}>
            Dopasowanie:
          </p>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {card.subQuestions.map((sub, idx) => (
              <li key={idx} style={{ fontSize: '0.9rem', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px' }}>
                <strong>{sub.label}</strong> → {sub.answer}
              </li>
            ))}
          </ul>
        </div>
      );
    } else if (card.type === 'open') {
      return (
        <div>
          <p style={{ color: 'var(--accent-cyan)', fontWeight: '600', marginBottom: '12px' }}>
            Rozwiązanie / Odpowiedź:
          </p>
          <p style={{ fontSize: '1.05rem', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '10px 16px', borderRadius: '8px' }}>
            {card.answer}
          </p>
        </div>
      );
    }
    return null;
  };

  // ==========================================
  // QUIZ TAB (Test)
  // ==========================================
  const [quizActive, setQuizActive] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({}); // { qId: answerValue }
  const [quizTimer, setQuizTimer] = useState(1800); // 30 mins countdown
  const [quizSize, setQuizSize] = useState(20); // default 20 questions
  const [quizFilterYear, setQuizFilterYear] = useState('all'); // 'all' | '24_25' | '23_24'
  const [quizMode, setQuizMode] = useState('training'); // 'training' | 'exam'
  const [checkedQuestions, setCheckedQuestions] = useState({}); // { qId: true }
  const [trainingStats, setTrainingStats] = useState({ correct: 0, total: 0 });
  const [currentQuizQuestionIndex, setCurrentQuizQuestionIndex] = useState(0);
  
  const timerIntervalRef = useRef(null);

  // Starts the quiz
  const handleStartQuiz = () => {
    let pool = [...questionsData];
    if (quizFilterYear === '24_25') {
      pool = pool.filter(q => q.year === '2024/2025');
    } else if (quizFilterYear === '23_24') {
      pool = pool.filter(q => q.year === '2023/2024');
    }

    // Shuffle pool and slice size
    const shuffled = pool.sort(() => 0.5 - Math.random());
    const limit = quizSize === 999 ? pool.length : Math.min(quizSize, pool.length);
    const selected = shuffled.slice(0, limit);

    // Initialize user answers state structure
    const initialAnswers = {};
    selected.forEach(q => {
      if (q.type === 'choice') {
        initialAnswers[q.id] = '';
      } else if (q.type === 'yes_no') {
        initialAnswers[q.id] = {}; // { a: '', b: '' }
      } else if (q.type === 'matching') {
        initialAnswers[q.id] = {}; // { label1: '' }
      } else if (q.type === 'open') {
        initialAnswers[q.id] = '';
      }
    });

    setQuizQuestions(selected);
    setUserAnswers(initialAnswers);
    setQuizActive(true);
    setQuizSubmitted(false);
    setCheckedQuestions({});
    setTrainingStats({ correct: 0, total: 0 });
    setCurrentQuizQuestionIndex(0);

    if (quizMode === 'exam') {
      setQuizTimer(1800); // 30 minutes
      // Start timer interval
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setQuizTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            // Auto submit
            setQuizSubmitted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const formatQuizTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectChoiceOption = (qId, optionLetter) => {
    if (quizSubmitted) return;
    if (quizMode === 'training') {
      if (checkedQuestions[qId]) return;
      setUserAnswers(prev => {
        const next = { ...prev, [qId]: optionLetter };
        const q = quizQuestions.find(x => x.id === qId);
        const isCorrect = optionLetter === q?.answer;
        setTrainingStats(stats => ({
          correct: stats.correct + (isCorrect ? 1 : 0),
          total: stats.total + 1
        }));
        setCheckedQuestions(checked => ({ ...checked, [qId]: true }));
        return next;
      });
    } else {
      setUserAnswers(prev => ({
        ...prev,
        [qId]: optionLetter
      }));
    }
  };

  const handleSelectYesNoOption = (qId, subLetter, answer) => {
    if (quizSubmitted || (quizMode === 'training' && checkedQuestions[qId])) return;
    setUserAnswers(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        [subLetter]: answer
      }
    }));
  };

  const handleSelectMatchingOption = (qId, label, answer) => {
    if (quizSubmitted || (quizMode === 'training' && checkedQuestions[qId])) return;
    setUserAnswers(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        [label]: answer
      }
    }));
  };

  const handleOpenAnswerInput = (qId, value) => {
    if (quizSubmitted || (quizMode === 'training' && checkedQuestions[qId])) return;
    setUserAnswers(prev => ({
      ...prev,
      [qId]: value
    }));
  };

  const handleCheckQuestion = (qId) => {
    if (checkedQuestions[qId]) return;
    const q = quizQuestions.find(x => x.id === qId);
    if (!q) return;

    const answer = userAnswers[qId];
    let isCorrect = false;

    if (q.type === 'yes_no') {
      isCorrect = q.subQuestions.every(sub => answer?.[sub.letter] === sub.answer);
    } else if (q.type === 'matching') {
      isCorrect = q.subQuestions.every(sub => answer?.[sub.label] === sub.answer);
    } else if (q.type === 'open') {
      const userClean = (answer || '').trim().toLowerCase();
      const correctClean = q.answer.trim().toLowerCase();
      isCorrect = userClean && (correctClean.includes(userClean) || userClean.includes(correctClean) || checkOpenKeywordSimilarity(userClean, correctClean));
    }

    setTrainingStats(stats => ({
      correct: stats.correct + (isCorrect ? 1 : 0),
      total: stats.total + 1
    }));

    setCheckedQuestions(checked => ({
      ...checked,
      [qId]: true
    }));
  };

  // Submit and calculate score
  const handleCalculateScore = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setQuizSubmitted(true);

    let earnedPoints = 0;
    let maxPoints = 0;

    quizQuestions.forEach(q => {
      if (q.type === 'choice') {
        maxPoints += 1;
        if (userAnswers[q.id] === q.answer) {
          earnedPoints += 1;
        }
      } else if (q.type === 'yes_no') {
        maxPoints += q.subQuestions.length;
        q.subQuestions.forEach(sub => {
          if (userAnswers[q.id]?.[sub.letter] === sub.answer) {
            earnedPoints += 1;
          }
        });
      } else if (q.type === 'matching') {
        maxPoints += q.subQuestions.length;
        q.subQuestions.forEach(sub => {
          if (userAnswers[q.id]?.[sub.label] === sub.answer) {
            earnedPoints += 1;
          }
        });
      } else if (q.type === 'open') {
        // Open questions require manual check, but we can do a loose substring comparison
        maxPoints += 2; // heavier weight for open questions
        const userClean = (userAnswers[q.id] || '').trim().toLowerCase();
        const correctClean = q.answer.trim().toLowerCase();
        
        // Simple heuristic: if user answer matches key parts of correct answer
        // E.g. user: "a) 193.168.5.128 b) 62", correct: "a) 193.168.5.128 b) 62"
        // Or if it matches at least 60% of keywords
        if (userClean && (correctClean.includes(userClean) || userClean.includes(correctClean) || checkOpenKeywordSimilarity(userClean, correctClean))) {
          earnedPoints += 2;
        } else if (userClean) {
          earnedPoints += 1; // partial point for trying
        }
      }
    });

    const pct = Math.round((earnedPoints / maxPoints) * 100);

    // Save test stats
    setTestStats(prev => {
      const next = {
        count: prev.count + 1,
        totalScore: prev.totalScore + pct,
        maxScore: Math.max(prev.maxScore, pct)
      };
      return next;
    });
  };

  const checkOpenKeywordSimilarity = (user, correct) => {
    // Extract alphanumeric keywords of length > 2
    const userWords = user.split(/[^a-zA-Z0-9]/).filter(w => w.length > 2);
    const correctWords = correct.split(/[^a-zA-Z0-9]/).filter(w => w.length > 2);
    if (correctWords.length === 0) return false;
    let matches = 0;
    correctWords.forEach(w => {
      if (userWords.includes(w)) matches++;
    });
    return (matches / correctWords.length) >= 0.5; // at least 50% keyword overlap
  };

  // Helper for generating distinct options in matching dropdowns
  const getMatchingDropdownOptions = (question) => {
    // Extract unique answer options
    const options = new Set();
    question.subQuestions.forEach(sub => options.add(sub.answer));
    // Also inject some distractors from general options if they exist
    return Array.from(options);
  };

  // Reset quiz state
  const handleExitQuiz = () => {
    setQuizActive(false);
    setQuizSubmitted(false);
    setQuizQuestions([]);
    setUserAnswers({});
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const handleExitQuizConfirm = () => {
    if (quizSubmitted) {
      handleExitQuiz();
      return;
    }
    const msg = quizMode === 'training'
      ? "Czy na pewno chcesz przerwać i opuścić trening? Twój postęp w tym treningu zostanie utracony."
      : "Czy na pewno chcesz przerwać i opuścić test? Twój postęp w tym teście zostanie utracony.";
    const confirmExit = window.confirm(msg);
    if (confirmExit) {
      handleExitQuiz();
    }
  };

  const handleTabChange = (tabName) => {
    if (quizActive && !quizSubmitted && (quizMode === 'exam' || Object.keys(checkedQuestions).length < quizQuestions.length)) {
      const msg = quizMode === 'training'
        ? "Czy na pewno chcesz opuścić trening i powrócić do menu? Twój obecny postęp zostanie utracony."
        : "Czy na pewno chcesz opuścić test i powrócić do menu? Twój obecny postęp zostanie utracony.";
      const confirmExit = window.confirm(msg);
      if (!confirmExit) return;
      handleExitQuiz();
    } else if (quizActive) {
      handleExitQuiz();
    }
    setActiveTab(tabName);
  };

  // ==========================================
  // RENDER SECTIONS
  // ==========================================

  // Lock Screen Render
  if (!isAuthenticated) {
    return (
      <div className="lock-screen-container">
        <div className="glow-orb orb-1"></div>
        <div className="glow-orb orb-2"></div>
        <div className="glass-panel lock-card fade-in">
          <div className="lock-icon">
            <svg viewBox="0 0 24 24">
              <path d="M18,8H17V6A5,5,0,0,0,7,6V8H6a2,2,0,0,0,-2,2v10a2,2,0,0,0,2,2h12a2,2,0,0,0,2,-2V10A2,2,0,0,0,18,8ZM9,6a3,3,0,0,1,6,0V8H9ZM12,17a1.5,1.5,0,1,1,1.5,-1.5A1.5,1.5,0,0,1,12,17Z" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Egzamin SK 2026</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Wprowadź kod dostępu, aby odblokować materiały edukacyjne do jutrzejszego egzaminu.
          </p>
          <form onSubmit={handleAuthenticate}>
            <input
              type="password"
              className="lock-input"
              placeholder="Kod dostępu"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              autoFocus
            />
            {passcodeError && <p className="error-text">{passcodeError}</p>}
            <button type="submit" className="btn-primary">
              Odblokuj portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>

      {/* Main Header / Navigation */}
      <header className="app-header">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>
            <span className="title-gradient">Sieci Komputerowe</span> Study Portal
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
            Czas nauki w tej sesji: <strong style={{ color: 'var(--accent-cyan)' }}>{formatTime(studyTime)}</strong>
          </p>
        </div>
        <nav className="tabs-navigation">
          <button
            className={`tab-btn ${activeTab === 'theory' ? 'active' : ''}`}
            onClick={() => handleTabChange('theory')}
          >
            Teoria (Wykłady)
          </button>
          <button
            className={`tab-btn ${activeTab === 'flashcards' ? 'active' : ''}`}
            onClick={() => handleTabChange('flashcards')}
          >
            Fiszki (Pytania)
          </button>
          <button
            className={`tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
            onClick={() => handleTabChange('quiz')}
          >
            Test próbny
          </button>
          <button
            className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => handleTabChange('stats')}
          >
            Statystyki
          </button>
        </nav>
      </header>

      {/* MAIN CONTAINER */}
      <main className="glass-panel" style={{ minHeight: '600px' }}>
        
        {/* ========================================================== */}
        {/* TAB 1: THEORY (Wykłady) */}
        {/* ========================================================== */}
        {activeTab === 'theory' && !quizActive && (
          <div className="fade-in">
            <div className="search-container">
              <input
                type="text"
                className="search-input"
                placeholder="Wyszukaj pojęcia na slajdach wykładowcy (np. TCP, IP, maska)..."
                value={slideSearchQuery}
                onChange={(e) => setSlideSearchQuery(e.target.value)}
              />
              {slideSearchQuery && (
                <button className="btn-icon" onClick={() => setSlideSearchQuery('')}>
                  Wyczyść
                </button>
              )}
            </div>

            <div className="theory-layout">
              {/* Lecture Cards List */}
              <div className="lectures-list">
                <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '10px' }}>Spis Wykładów</h3>
                {lecturesData.map((lec) => (
                  <div
                    key={lec.id}
                    className={`lecture-card ${selectedLecture.id === lec.id ? 'active' : ''}`}
                    onClick={() => selectLecture(lec)}
                  >
                    <h4>{lec.title.split(':')[0]}</h4>
                    <span style={{ fontSize: '0.8rem', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {lec.title.split(':')[1]?.trim() || ''}
                    </span>
                    <span>{lec.slides.length} slajdów</span>
                  </div>
                ))}
              </div>

              {/* Slide Viewer */}
              <div className="slide-viewer">
                <div>
                  <div className="slide-header">
                    <h3 style={{ fontSize: '1.25rem', color: '#fff', margin: 0 }}>
                      {selectedLecture.title.split(':')[0]}
                    </h3>
                    <div className="slide-dropdown-container">
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Skocz do:</span>
                      <select
                        className="slide-dropdown"
                        value={currentSlideIndex}
                        onChange={(e) => setCurrentSlideIndex(parseInt(e.target.value, 10))}
                      >
                        {selectedLecture.slides.map((slide, idx) => {
                          const firstLine = slide.split('\n')[0].trim().replace(/^([·•▪\-*]|o\s)\s*/, '');
                          const label = firstLine.length > 40 ? firstLine.substring(0, 40) + '...' : firstLine;
                          return (
                            <option key={idx} value={idx}>
                              {idx + 1}. {label || `Slajd ${idx + 1}`}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="slide-content-box">
                    {renderSlide(
                      selectedLecture.slides[currentSlideIndex],
                      slideSearchQuery
                    )}

                    {/* Active Recall Slide Mini Quiz */}
                    {slideQuizQuestion && (
                      <div className="mini-quiz-box">
                        <div className="mini-quiz-title">
                          <span>🧠</span> Szybki test ze slajdu (Sprawdź się!)
                        </div>
                        <div className="mini-quiz-text">
                          {slideQuizQuestion.text}
                        </div>
                        <div className="mini-quiz-options">
                          {slideQuizQuestion.options.map((opt) => {
                            let optClass = '';
                            if (slideQuizSelected === opt.letter) {
                              optClass = 'selected';
                            }
                            if (slideQuizSubmitted) {
                              if (opt.isCorrect) optClass = 'correct';
                              else if (slideQuizSelected === opt.letter) optClass = 'incorrect';
                            }
                            return (
                              <div
                                key={opt.letter}
                                className={`mini-quiz-option ${optClass}`}
                                onClick={() => {
                                  if (!slideQuizSubmitted) {
                                    setSlideQuizSelected(opt.letter);
                                    setSlideQuizSubmitted(true);
                                  }
                                }}
                              >
                                <strong>{opt.letter.toUpperCase()})</strong> {opt.text}
                              </div>
                            );
                          })}
                        </div>
                        {slideQuizSubmitted && (
                          <div className="mini-quiz-explanation">
                            {slideQuizSelected === slideQuizQuestion.answer ? (
                              <div className="mini-quiz-feedback success">✓ Gratulacje! Poprawna odpowiedź.</div>
                            ) : (
                              <div className="mini-quiz-feedback error">
                                ✕ Niestety, to błąd. Twoja odpowiedź to ({slideQuizSelected.toUpperCase()}), a poprawna to ({slideQuizQuestion.answer.toUpperCase()}).
                              </div>
                            )}
                            <div style={{ marginTop: '8px', color: '#d1d5db', lineHeight: '1.5' }}>
                              <strong>Wyjaśnienie:</strong> {getExplanationForQuestion(slideQuizQuestion, slideQuizSelected)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="slide-controls" style={{ marginTop: '24px' }}>
                  <button
                    className="btn-icon"
                    onClick={prevSlide}
                    disabled={currentSlideIndex === 0}
                  >
                    ← Poprzedni
                  </button>
                  <span className="slide-progress">
                    Slajd {currentSlideIndex + 1} z {selectedLecture.slides.length}
                  </span>
                  <button
                    className="btn-icon"
                    onClick={nextSlide}
                    disabled={currentSlideIndex === selectedLecture.slides.length - 1}
                  >
                    Następny →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 2: FLASHCARDS (Fiszki) */}
        {/* ========================================================== */}
        {activeTab === 'flashcards' && !quizActive && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', color: '#fff' }}>Fiszki do Nauki</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Kliknij w kartę, aby zobaczyć poprawną odpowiedź. Zaznacz "Umiem" lub "Nie umiem", by śledzić swój postęp.
                </p>
              </div>
              <div>
                <select
                  className="form-select"
                  style={{ width: '200px' }}
                  value={cardFilter}
                  onChange={(e) => setCardFilter(e.target.value)}
                >
                  <option value="all">Wszystkie ({questionsData.length})</option>
                  <option value="24_25">Rok 24/25 ({questionsData.filter(q => q.year === '2024/2025').length})</option>
                  <option value="23_24">Rok 23/24 ({questionsData.filter(q => q.year === '2023/2024').length})</option>
                  <option value="forgotten">Tylko "Nie umiem" ({forgottenCards.length})</option>
                </select>
              </div>
            </div>

            {filteredCards.length > 0 ? (
              <div className="flashcards-container">
                <div
                  className={`flashcard-wrapper ${isCardFlipped ? 'flipped' : ''}`}
                  onClick={() => setIsCardFlipped(!isCardFlipped)}
                >
                  <div className="flashcard-inner">
                    {/* Front of Card */}
                    <div className="flashcard-front">
                      <span className="flashcard-number">Pytanie {currentCardIndex + 1} z {filteredCards.length}</span>
                      <span className="flashcard-year">{filteredCards[currentCardIndex].year}</span>
                      <p className="flashcard-text">
                        {filteredCards[currentCardIndex].text}
                      </p>
                      {filteredCards[currentCardIndex].options?.length > 0 && (
                        <div style={{ width: '100%', marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                          {filteredCards[currentCardIndex].options.map((opt, oIdx) => (
                            <span key={oIdx} style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px', color: 'var(--text-secondary)' }}>
                              <strong>{opt.letter.toUpperCase()})</strong> {opt.text.substring(0, 30)}{opt.text.length > 30 ? '...' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                      <span style={{ position: 'absolute', bottom: '20px', fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                        Obróć kartę kliknięciem
                      </span>
                    </div>

                    {/* Back of Card */}
                    <div className="flashcard-back">
                      <span className="flashcard-number">Odpowiedź do pytania {currentCardIndex + 1}</span>
                      {renderFlashcardAnswer(filteredCards[currentCardIndex])}
                      <span style={{ position: 'absolute', bottom: '20px', fontSize: '0.8rem', color: 'var(--accent-purple)' }}>
                        Kliknij ponownie, aby powrócić
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flashcard-actions">
                  <button
                    className="btn-card-nok"
                    onClick={() => handleCardForgot(filteredCards[currentCardIndex].id)}
                  >
                    ✕ Nie umiem
                  </button>
                  <button
                    className="btn-card-ok"
                    onClick={() => handleCardKnow(filteredCards[currentCardIndex].id)}
                  >
                    ✓ Umiem
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '16px' }}>
                  Brak fiszek w wybranej kategorii.
                </p>
                {cardFilter === 'forgotten' && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    Gratulacje! Opanowałeś wszystkie pytania. Wybierz inną kategorię filtrowania powyżej.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 3: QUIZ (Test próbny) */}
        {/* ========================================================== */}
        {activeTab === 'quiz' && (
          <div className="fade-in">
            {/* Quiz Configuration Panel */}
            {!quizActive && (
              <div className="quiz-settings">
                <h2 style={{ fontSize: '1.6rem', color: '#fff', marginBottom: '8px' }}>Test próbny z Sieci Komputerowych</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px' }}>
                  Skonfiguruj parametry mock-egzaminu. Pytania zostaną wybrane losowo z bazy pytań egzaminacyjnych.
                </p>

                <div className="form-group">
                  <label>Wybierz tryb rozwiązania:</label>
                  <div className="quiz-mode-selector" style={{ display: 'flex', gap: '10px', marginTop: '8px', marginBottom: '16px' }}>
                    <button
                      type="button"
                      className={`mode-select-btn ${quizMode === 'training' ? 'active' : ''}`}
                      onClick={() => setQuizMode('training')}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: quizMode === 'training' ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.08)',
                        background: quizMode === 'training' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.02)',
                        color: quizMode === 'training' ? 'var(--accent-cyan)' : '#d1d5db',
                        cursor: 'pointer',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontSize: '1rem', marginBottom: '4px' }}>🧠 Tryb Treningowy</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                        Natychmiastowe sprawdzanie, wyjaśnienia błędów, brak presji czasu.
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`mode-select-btn ${quizMode === 'exam' ? 'active' : ''}`}
                      onClick={() => setQuizMode('exam')}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: quizMode === 'exam' ? '1px solid var(--accent-pink)' : '1px solid rgba(255,255,255,0.08)',
                        background: quizMode === 'exam' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(255,255,255,0.02)',
                        color: quizMode === 'exam' ? 'var(--accent-pink)' : '#d1d5db',
                        cursor: 'pointer',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontSize: '1rem', marginBottom: '4px' }}>⏱️ Tryb Egzaminacyjny</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                        Symulacja prawdziwego egzaminu z zegarem 30 minut, ocena na końcu.
                      </div>
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Wybierz rok akademicki pytań:</label>
                  <select
                    className="form-select"
                    value={quizFilterYear}
                    onChange={(e) => setQuizFilterYear(e.target.value)}
                  >
                    <option value="all">Wszystkie lata ({questionsData.length} pytań)</option>
                    <option value="24_25">Tylko 2024/2025 ({questionsData.filter(q => q.year === '2024/2025').length} pytań)</option>
                    <option value="23_24">Tylko 2023/2024 ({questionsData.filter(q => q.year === '2023/2024').length} pytań)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Ilość pytań w teście:</label>
                  <select
                    className="form-select"
                    value={quizSize}
                    onChange={(e) => setQuizSize(parseInt(e.target.value, 10))}
                  >
                    <option value="10">10 pytań</option>
                    <option value="20">20 pytań</option>
                    <option value="30">30 pytań</option>
                    <option value="50">50 pytań</option>
                    <option value="100">100 pytań</option>
                    <option value="999">Wszystkie dostępne ({questionsData.length} pytań)</option>
                  </select>
                </div>

                <div style={{ marginTop: '30px' }}>
                  <button className="btn-primary" onClick={handleStartQuiz}>
                    {quizMode === 'training' ? 'Rozpocznij trening (bez limitu czasu)' : 'Rozpocznij egzamin (30 minut)'}
                  </button>
                </div>
              </div>
            )}

            {/* Quiz Working Screen */}
            {quizActive && (
              <div>
                <div className="quiz-header">
                  <div>
                    <h2 style={{ fontSize: '1.4rem', color: '#fff' }}>
                      {quizMode === 'training' ? '🧠 Tryb Treningowy' : '⏱️ Twój Test'}
                    </h2>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Zawiera {quizQuestions.length} pytań.
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {quizMode === 'exam' ? (
                      <div className="timer">
                        {formatQuizTimer(quizTimer)}
                      </div>
                    ) : (
                      <div className="timer" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-cyan)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                        Trening
                      </div>
                    )}
                    <button className="btn-icon" style={{ padding: '6px 14px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }} onClick={handleExitQuizConfirm}>
                      {quizMode === 'training' ? 'Wyjdź z treningu' : 'Wyjdź z testu'}
                    </button>
                  </div>
                </div>

                {/* Training Mode Pagination and Score banner */}
                {quizMode === 'training' && (
                  <>
                    <div className="training-score-banner" style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      padding: '16px 20px',
                      borderRadius: '16px',
                      marginBottom: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Postęp nauki:</span>
                        <strong style={{ fontSize: '1.1rem', color: '#fff', marginLeft: '8px' }}>
                          {trainingStats.total} / {quizQuestions.length} pytań
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Poprawne odpowiedzi:</span>
                        <strong style={{ fontSize: '1.2rem', color: '#10b981', marginLeft: '8px' }}>
                          {trainingStats.correct}
                        </strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginLeft: '4px' }}>
                          ({trainingStats.total > 0 ? Math.round((trainingStats.correct / trainingStats.total) * 100) : 0}%)
                        </span>
                      </div>
                    </div>

                    <div className="quiz-pagination" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '24px', justifyContent: 'center' }}>
                      {quizQuestions.map((q, idx) => {
                        const isAnswered = checkedQuestions[q.id];
                        let isCorrect = false;
                        if (isAnswered) {
                          const answer = userAnswers[q.id];
                          if (q.type === 'choice') {
                            isCorrect = answer === q.answer;
                          } else if (q.type === 'yes_no') {
                            isCorrect = q.subQuestions.every(sub => answer?.[sub.letter] === sub.answer);
                          } else if (q.type === 'matching') {
                            isCorrect = q.subQuestions.every(sub => answer?.[sub.label] === sub.answer);
                          } else if (q.type === 'open') {
                            const userClean = (answer || '').trim().toLowerCase();
                            const correctClean = q.answer.trim().toLowerCase();
                            isCorrect = userClean && (correctClean.includes(userClean) || userClean.includes(correctClean) || checkOpenKeywordSimilarity(userClean, correctClean));
                          }
                        }

                        let bg = 'rgba(255,255,255,0.05)';
                        let border = '1px solid rgba(255,255,255,0.08)';
                        let color = '#d1d5db';

                        if (isAnswered) {
                          bg = isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
                          border = isCorrect ? '1px solid #10b981' : '1px solid #ef4444';
                          color = isCorrect ? '#10b981' : '#ef4444';
                        }

                        if (idx === currentQuizQuestionIndex) {
                          border = isAnswered ? (isCorrect ? '2px solid #10b981' : '2px solid #ef4444') : '2px solid var(--accent-cyan)';
                          bg = idx === currentQuizQuestionIndex && !isAnswered ? 'rgba(56, 189, 248, 0.1)' : bg;
                        }

                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setCurrentQuizQuestionIndex(idx)}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: bg,
                              border: border,
                              color: color,
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Questions render */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {quizQuestions
                    .map((q, idx) => ({ q, idx }))
                    .filter(({ idx }) => quizMode === 'exam' || idx === currentQuizQuestionIndex)
                    .map(({ q, idx }) => {
                      const isQuestionChecked = checkedQuestions[q.id];
                      const isRevealed = quizSubmitted || (quizMode === 'training' && isQuestionChecked);

                      return (
                        <div key={q.id} className="question-card">
                          <h4 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '8px' }}>
                            Pytanie {idx + 1}. {q.text}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Typ: {q.type === 'choice' ? 'Wybór jednokrotny' : q.type === 'yes_no' ? 'Prawda/Fałsz' : q.type === 'matching' ? 'Dopasowanie tabeli' : 'Otwarte obliczeniowe'} | Rok: {q.year}
                          </span>

                          {/* Rendering by Question Type */}
                          
                          {/* 1. Choice */}
                          {q.type === 'choice' && (
                            <div className="options-list">
                              {q.options.map((opt) => {
                                const isSelected = userAnswers[q.id] === opt.letter;
                                let optClass = '';
                                if (isSelected) optClass = 'selected';
                                if (isRevealed) {
                                  if (opt.isCorrect) optClass = 'correct';
                                  else if (isSelected && !opt.isCorrect) optClass = 'incorrect';
                                }

                                return (
                                  <div
                                    key={opt.letter}
                                    className={`option-item ${optClass} ${isRevealed ? 'locked' : ''}`}
                                    onClick={() => handleSelectChoiceOption(q.id, opt.letter)}
                                  >
                                    <span className="option-marker">{opt.letter}</span>
                                    <span>{opt.text}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* 2. Yes/No Grid */}
                          {q.type === 'yes_no' && (
                            <table className="yes-no-grid">
                              <thead>
                                <tr>
                                  <th>Cecha / Pole</th>
                                  <th>Odpowiedź</th>
                                </tr>
                              </thead>
                              <tbody>
                                {q.subQuestions.map((sub) => {
                                  const currentSelection = userAnswers[q.id]?.[sub.letter];
                                  
                                  let takClass = '';
                                  let nieClass = '';
                                  if (currentSelection === 'tak') takClass = 'selected';
                                  if (currentSelection === 'nie') nieClass = 'selected';

                                  if (isRevealed) {
                                    if (sub.answer === 'tak') {
                                      takClass = 'correct';
                                      if (currentSelection === 'nie') nieClass = 'incorrect';
                                    } else {
                                      nieClass = 'correct';
                                      if (currentSelection === 'tak') takClass = 'incorrect';
                                    }
                                  }

                                  return (
                                    <tr key={sub.letter}>
                                      <td><strong>{sub.letter.toUpperCase()})</strong> {sub.text}</td>
                                      <td>
                                        <div className="yes-no-options">
                                          <button
                                            type="button"
                                            className={`yes-no-btn ${takClass}`}
                                            onClick={() => handleSelectYesNoOption(q.id, sub.letter, 'tak')}
                                            disabled={isRevealed}
                                          >
                                            TAK
                                          </button>
                                          <button
                                            type="button"
                                            className={`yes-no-btn ${nieClass}`}
                                            onClick={() => handleSelectYesNoOption(q.id, sub.letter, 'nie')}
                                            disabled={isRevealed}
                                          >
                                            NIE
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}

                          {/* 3. Matching Dropdowns */}
                          {q.type === 'matching' && (
                            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {q.subQuestions.map((sub, sIdx) => {
                                const curVal = userAnswers[q.id]?.[sub.label] || '';
                                const isCorrect = curVal === sub.answer;
                                const optionsList = getMatchingDropdownOptions(q);

                                let borderStyle = '1px solid rgba(255,255,255,0.06)';
                                let bgStyle = 'rgba(255,255,255,0.02)';
                                if (isRevealed) {
                                  borderStyle = isCorrect ? '1px solid #10b981' : '1px solid #ef4444';
                                  bgStyle = isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)';
                                }

                                return (
                                  <div key={sIdx} className="matching-row" style={{ border: borderStyle, background: bgStyle, padding: '10px 16px', borderRadius: '10px' }}>
                                    <span style={{ fontSize: '0.95rem' }}>
                                      <strong>{sub.letter ? sub.letter.toUpperCase() + ') ' : ''}{sub.label}</strong>
                                    </span>
                                    <div>
                                      <select
                                        className="matching-select"
                                        value={curVal}
                                        onChange={(e) => handleSelectMatchingOption(q.id, sub.label, e.target.value)}
                                        disabled={isRevealed}
                                      >
                                        <option value="">-- Wybierz dopasowanie --</option>
                                        {optionsList.map((opt, oIdx) => (
                                          <option key={oIdx} value={opt}>{opt}</option>
                                        ))}
                                      </select>
                                      {isRevealed && !isCorrect && (
                                        <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px', textAlign: 'right' }}>
                                          Poprawnie: {sub.answer}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* 4. Open */}
                          {q.type === 'open' && (
                            <div>
                              <input
                                type="text"
                                className="open-answer-input"
                                placeholder="Wpisz swoją odpowiedź / obliczenia..."
                                value={userAnswers[q.id] || ''}
                                onChange={(e) => handleOpenAnswerInput(q.id, e.target.value)}
                                disabled={isRevealed}
                              />
                              {isRevealed && (
                                <div className="correct-open-ans">
                                  <strong>Poprawne rozwiązanie z klucza:</strong> {q.answer}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Check Button for Multi-input/Open Questions in Training Mode */}
                          {quizMode === 'training' && !isQuestionChecked && q.type !== 'choice' && (
                            <div style={{ marginTop: '16px' }}>
                              <button
                                type="button"
                                className="btn-primary"
                                style={{ padding: '8px 20px', fontSize: '0.9rem', width: 'auto' }}
                                onClick={() => handleCheckQuestion(q.id)}
                              >
                                Sprawdź odpowiedź
                              </button>
                            </div>
                          )}

                          {/* Explanation Section */}
                          {isRevealed && (
                            <div className="mini-quiz-explanation" style={{ marginTop: '16px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ color: '#d1d5db', lineHeight: '1.5', fontSize: '0.95rem' }}>
                                <strong>Wyjaśnienie:</strong> {getExplanationForQuestion(q, userAnswers[q.id])}
                              </div>
                            </div>
                          )}

                          {/* Next Question Navigation for Training Mode */}
                          {quizMode === 'training' && isQuestionChecked && currentQuizQuestionIndex < quizQuestions.length - 1 && (
                            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="btn-primary"
                                style={{
                                  padding: '10px 24px',
                                  fontSize: '0.95rem',
                                  width: 'auto',
                                  background: 'linear-gradient(90deg, var(--accent-cyan) 0%, var(--accent-purple) 100%)'
                                }}
                                onClick={() => setCurrentQuizQuestionIndex(prev => prev + 1)}
                              >
                                Następne pytanie →
                              </button>
                            </div>
                          )}

                          {/* End Training Button for Training Mode */}
                          {quizMode === 'training' && isQuestionChecked && currentQuizQuestionIndex === quizQuestions.length - 1 && (
                            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="btn-primary"
                                style={{
                                  padding: '10px 24px',
                                  fontSize: '0.95rem',
                                  width: 'auto',
                                  background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                                }}
                                onClick={() => {
                                  const pct = Math.round((trainingStats.correct / quizQuestions.length) * 100);
                                  setTestStats(prev => ({
                                    count: prev.count + 1,
                                    totalScore: prev.totalScore + pct,
                                    maxScore: Math.max(prev.maxScore, pct)
                                  }));
                                  handleExitQuiz();
                                  alert(`Trening zakończony! Twój wynik: ${trainingStats.correct} / ${quizQuestions.length} (${pct}%)`);
                                }}
                              >
                                Zakończ trening i zapisz wynik ✓
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Quiz Bottom Buttons */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '40px', justifyContent: 'center' }}>
                  {quizMode === 'exam' ? (
                    <>
                      {!quizSubmitted ? (
                        <button className="btn-primary" style={{ width: '220px' }} onClick={handleCalculateScore}>
                          Zakończ i oceń test
                        </button>
                      ) : (
                        <button className="btn-primary" style={{ width: '220px', background: 'linear-gradient(90deg, var(--accent-purple) 0%, var(--accent-pink) 100%)' }} onClick={handleExitQuiz}>
                          Powrót do menu testów
                        </button>
                      )}
                      <button className="btn-icon" onClick={handleExitQuizConfirm}>
                        Anuluj test / Wyjdź
                      </button>
                    </>
                  ) : (
                    <button className="btn-icon" onClick={handleExitQuizConfirm}>
                      Przerwij trening / Wyjdź
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 4: STATISTICS (Statystyki) */}
        {/* ========================================================== */}
        {activeTab === 'stats' && !quizActive && (
          <div className="fade-in">
            <h2 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '24px' }}>Twoje Statystyki Nauki</h2>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value cyan">{rememberedCards.length}</div>
                <div className="stat-label">Opanowane pytania (Umiem)</div>
                <div className="progress-container">
                  <div
                    className="progress-bar"
                    style={{ width: `${Math.min(100, Math.round((rememberedCards.length / questionsData.length) * 100))}%` }}
                  ></div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-value pink">{forgottenCards.length}</div>
                <div className="stat-label">Pytania do powtórki (Nie umiem)</div>
              </div>
              <div className="stat-card">
                <div className="stat-value purple">
                  {testStats.count > 0 ? `${Math.round(testStats.totalScore / testStats.count)}%` : '0%'}
                </div>
                <div className="stat-label">Średni wynik testów</div>
              </div>
              <div className="stat-card">
                <div className="stat-value cyan">
                  {testStats.count > 0 ? `${testStats.maxScore}%` : '0%'}
                </div>
                <div className="stat-label">Najlepszy wynik testu</div>
              </div>
            </div>

            <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>
                Trudne pytania do natychmiastowej powtórki ({forgottenCards.length})
              </h3>
              {forgottenCards.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
                  {forgottenCards.map((cardId) => {
                    const q = questionsData.find(x => x.id === cardId);
                    if (!q) return null;
                    return (
                      <div
                        key={q.id}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginRight: '16px', fontSize: '0.9rem' }}>
                          <strong>{q.year} - Pyt. {q.number}:</strong> {q.text}
                        </div>
                        <button
                          style={{ background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', color: 'var(--accent-purple)', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                          onClick={() => {
                            // Set to flashcards view filtering only forgotten cards and go to this index
                            setCardFilter('forgotten');
                            setActiveTab('flashcards');
                          }}
                        >
                          Naucz się
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  Brak trudnych pytań! Zaznacz "Nie umiem" na dowolnej fiszce, aby pojawiła się tutaj do szybkiego powtórzenia.
                </p>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{ marginTop: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        <p>© 2026 Sieci Komputerowe Study Portal. Opracowano na egzamin.</p>
        <p style={{ marginTop: '4px' }}>
          Strona działa w trybie offline, dane zapisywane są lokalnie w Twojej przeglądarce.
        </p>
      </footer>
    </div>
  );
}

export default App;
