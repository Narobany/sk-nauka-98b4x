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
    if (passcodeInput.trim() === 'egzamin') {
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
    const selected = shuffled.slice(0, Math.min(quizSize, pool.length));

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
    setUserAnswers(prev => ({
      ...prev,
      [qId]: optionLetter
    }));
  };

  const handleSelectYesNoOption = (qId, subLetter, answer) => {
    if (quizSubmitted) return;
    setUserAnswers(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        [subLetter]: answer
      }
    }));
  };

  const handleSelectMatchingOption = (qId, label, answer) => {
    if (quizSubmitted) return;
    setUserAnswers(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        [label]: answer
      }
    }));
  };

  const handleOpenAnswerInput = (qId, value) => {
    if (quizSubmitted) return;
    setUserAnswers(prev => ({
      ...prev,
      [qId]: value
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
    const confirmExit = window.confirm("Czy na pewno chcesz przerwać i opuścić test? Twój postęp w tym teście zostanie utracony.");
    if (confirmExit) {
      handleExitQuiz();
    }
  };

  const handleTabChange = (tabName) => {
    if (quizActive && !quizSubmitted) {
      const confirmExit = window.confirm("Czy na pewno chcesz opuścić test i powrócić do menu? Twój obecny postęp zostanie utracony.");
      if (!confirmExit) return;
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
              placeholder="Kod dostępu (egzamin)"
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
                  <h3 style={{ marginBottom: '14px', fontSize: '1.25rem', color: '#fff' }}>
                    {selectedLecture.title}
                  </h3>
                  <div className="slide-content-box">
                    <p className="slide-text">
                      {renderHighlightedText(
                        selectedLecture.slides[currentSlideIndex],
                        slideSearchQuery
                      )}
                    </p>
                  </div>
                </div>

                <div className="slide-controls">
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
                    <option value="40">40 pytań</option>
                    <option value="60">Wszystkie dostępne pytań</option>
                  </select>
                </div>

                <div style={{ marginTop: '30px' }}>
                  <button className="btn-primary" onClick={handleStartQuiz}>
                    Rozpocznij test (30 minut)
                  </button>
                </div>
              </div>
            )}

            {/* Quiz Working Screen */}
            {quizActive && (
              <div>
                <div className="quiz-header">
                  <div>
                    <h2 style={{ fontSize: '1.4rem', color: '#fff' }}>Twój Test</h2>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Zawiera {quizQuestions.length} pytań z roku {quizFilterYear === 'all' ? '2023-2025' : quizFilterYear === '24_25' ? '2024/2025' : '2023/2024'}.
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="timer">
                      {formatQuizTimer(quizTimer)}
                    </div>
                    <button className="btn-icon" style={{ padding: '6px 14px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }} onClick={handleExitQuizConfirm}>
                      Wyjdź z testu
                    </button>
                  </div>
                </div>

                {/* Questions render */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {quizQuestions.map((q, idx) => (
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
                            if (quizSubmitted) {
                              if (opt.isCorrect) optClass = 'correct';
                              else if (isSelected && !opt.isCorrect) optClass = 'incorrect';
                            }

                            return (
                              <div
                                key={opt.letter}
                                className={`option-item ${optClass}`}
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

                              if (quizSubmitted) {
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
                                        disabled={quizSubmitted}
                                      >
                                        TAK
                                      </button>
                                      <button
                                        type="button"
                                        className={`yes-no-btn ${nieClass}`}
                                        onClick={() => handleSelectYesNoOption(q.id, sub.letter, 'nie')}
                                        disabled={quizSubmitted}
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
                            if (quizSubmitted) {
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
                                    disabled={quizSubmitted}
                                  >
                                    <option value="">-- Wybierz dopasowanie --</option>
                                    {optionsList.map((opt, oIdx) => (
                                      <option key={oIdx} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                  {quizSubmitted && !isCorrect && (
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
                            disabled={quizSubmitted}
                          />
                          {quizSubmitted && (
                            <div className="correct-open-ans">
                              <strong>Poprawne rozwiązanie z klucza:</strong> {q.answer}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Quiz Bottom Buttons */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '40px', justifyContent: 'center' }}>
                  {!quizSubmitted ? (
                    <button className="btn-primary" style={{ width: '220px' }} onClick={handleCalculateScore}>
                      Zakończ i oceń test
                    </button>
                  ) : (
                    <button className="btn-primary" style={{ width: '220px', background: 'linear-gradient(90deg, var(--accent-purple) 0%, var(--accent-pink) 100%)' }} onClick={handleExitQuiz}>
                      Powrót do menu testów
                    </button>
                  )}
                  <button className="btn-icon" onClick={handleExitQuiz}>
                    Anuluj test / Wyjdź
                  </button>
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
