/**
 * AuraFlow Frontend Application
 * * A mobile-first React application built with Material UI.
 * This app serves as the interface for the AuraFlow AIGC system, allowing users to:
 * 1. Chat with an AI Director to define creative goals.
 * 2. Generate Audio (MusicGen) and Video (Stable Diffusion) assets via the Python API.
 * 3. Preview, manage, and download generated media.
 * 4. Access a library of past assets and a focus timer tool.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  createTheme, ThemeProvider, CssBaseline, Box, Paper, BottomNavigation, BottomNavigationAction,
  Typography, IconButton, Avatar, TextField, Button, Checkbox, FormControlLabel, Menu, MenuItem,
  Chip, AppBar, Toolbar, Tabs, Tab, InputAdornment, Collapse, Drawer, List, ListItemButton,
  ListItemText, Divider, Dialog, ListItemSecondaryAction, DialogTitle, DialogContent, DialogActions,
  CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Icons
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PushPinIcon from '@mui/icons-material/PushPin';
import SendIcon from '@mui/icons-material/Send';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import VideocamIcon from '@mui/icons-material/Videocam';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import CreateIcon from '@mui/icons-material/Create';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import WifiIcon from '@mui/icons-material/Wifi';
import SignalCellularAlt2BarIcon from '@mui/icons-material/SignalCellularAlt2Bar';
import Battery50Icon from '@mui/icons-material/Battery50';
import axios from 'axios';

// ---------------- Theme & Gradients ----------------
const gradient = 'linear-gradient(45deg, #FBC2EB 30%, #A6C1EE 90%)';
const audioGradient = 'linear-gradient(62deg, #8EC5FC 0%, #E0C3FC 100%)';
const videoGradient = 'linear-gradient(45deg, #fbc2eb 0%, #fdd5aa 100%)';
const themeVideoGradient1 = 'linear-gradient(45deg, #FBC2EB 30%, #A6C1EE 90%)';
const chatBackgroundGradient = 'linear-gradient(180deg, #FDFDFD 0%, #F5F7FA 100%)';
const conversationAreaGradient = 'linear-gradient(180deg, #FFF9FB 0%, #F0F8FF 100%)';

const theme = createTheme({
  palette: { background: { default: '#F8F9FA' }, primary: { main: '#4C7CFF' }, secondary: { main: '#FBC2EB' }, text: { primary: '#212529', secondary: '#6c757d' } },
  typography: { fontFamily: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Arial', 'sans-serif'].join(',') },
});

// Styled Components
const GradientAvatar = styled(Avatar)(() => ({ background: gradient, width: 36, height: 36, color: '#fff' }));
const GradientButton = styled(Button)(() => ({ background: gradient, color: 'white', fontWeight: 'bold', borderRadius: '10px', boxShadow: '0 4px 16px rgba(76,124,255,0.12)', '&:hover': { opacity: 0.95 }, '&:focus': { outline: 'none', boxShadow: 'none' } }));
const GradientPlaceholder = styled('div')(({ gradientColor }) => ({ width: '100%', borderRadius: 8, background: gradientColor || 'linear-gradient(45deg,#EEE 30%,#DDD 90%)', position: 'relative' }));

// ---------------- Mock Data ----------------
// Initial data state to populate the UI before the user starts interacting
const initialConversations = [
  {
    id: 1,
    title: 'Calm Ocean Meditation',
    assets: { audio: { title: 'Lofi Chill Beat V1.mp3', duration: '0:30' }, videos: [{ id: 1, gradient: themeVideoGradient1 }] },
    messages: [
      { id: 1, type: 'user', text: 'Help me make a 30s Lofi track and 3 rainy videos.' },
      { id: 2, type: 'ai', text: 'Sure, I am generating Lofi audio and video clips for you...' },
      { id: 3, type: 'ai_asset' }, // This represents a "Legacy/Mock" asset card
    ],
  },
];

const fakeLibraryAssets = [
  { id: 1, type: 'audio', title: 'Lofi_Rain_V1.mp3', duration: '0:30', gradient: audioGradient },
  { id: 2, type: 'video', title: 'Rain_Clips_V1.mp4', duration: '0:45', gradient: videoGradient },
  { id: 3, type: 'video', title: 'Forest_Mist.mp4', duration: '0:15', gradient: videoGradient },
  { id: 4, type: 'audio', title: 'Meditation_Chimes.mp3', duration: '5:00', gradient: audioGradient },
  { id: 5, type: 'video', title: 'Beach_Waves.mp4', duration: '1:10', gradient: videoGradient },
  { id: 6, type: 'audio', title: 'Piano_Impromptu.mp3', duration: '2:15', gradient: audioGradient },
];

// ---------------- Component: CreatorStudio ----------------
// The main chat interface where users interact with the AI
function CreatorStudio({ conversation, onAddMessage, onOpenPreview }) {
  const [isWorkbenchCollapsed, setIsWorkbenchCollapsed] = useState(true);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');

  // Generation Parameters
  const [useAudio, setUseAudio] = useState(true);
  const [useVideo, setUseVideo] = useState(true);
  const [duration, setDuration] = useState('15');

  // Audio Playback Logic (Single source of truth)
  const [playingId, setPlayingId] = useState(null);
  const audioRefs = useRef({});

  const toggleAudio = (msgId) => {
    const audio = audioRefs.current[msgId];
    if (!audio) return;
    if (playingId === msgId) {
      audio.pause();
      setPlayingId(null);
    } else {
      if (playingId && audioRefs.current[playingId]) audioRefs.current[playingId].pause();
      audio.play().catch(e => console.error("Play error:", e));
      setPlayingId(msgId);
    }
  };

  const handleTouchStart = (e) => { /* Touch event handlers for mobile gestures */ }; 
  const handleTouchMove = (e) => { };
  const handleTouchEnd = (e) => { };

  // --- API Submission Handler ---
  const submit = async () => {
    if (!input.trim()) return;
    const currentInput = input;
    
    // 1. Add User Message to UI
    onAddMessage(conversation.id, { id: Date.now(), type: 'user', text: currentInput });
    setInput('');
    setIsLoading(true);

    try {
      // 2. Call the Python Backend API
      // Ensure your backend is running on port 8000
      const response = await axios.post('http://127.0.0.1:8000/api/chat', {
        message: currentInput,
        use_audio: useAudio,
        use_video: useVideo,
        duration: parseInt(duration) || 15
      });
      const data = response.data;
      const analysis = data.analysis || {};
      
      // 3. Create the AI Asset Message
      const newAssetMsg = {
        id: Date.now() + 1,
        type: 'ai_asset',
        content: {
          // Flag to differentiate real backend data from mock data
          isReal: true,
          audioSrc: data.audio_url,
          audioTitle: `AI_${analysis.audio_prompt?.split(',')[0] || 'Gen'}.wav`,
          audioPrompt: analysis.audio_prompt,
          audioDuration: duration,
          videoSrc: data.image_url,
          videoPrompt: analysis.video_prompt
        }
      };
      onAddMessage(conversation.id, newAssetMsg);
    } catch (error) {
      console.error(error);
      onAddMessage(conversation.id, { id: Date.now() + 1, type: 'ai', text: 'Generation Failed: ' + error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper variables for the top "Workbench" collapse
  const hasAudio = !!conversation?.assets?.audio;
  const hasVideos = conversation?.assets?.videos && conversation.assets.videos.length > 0;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: chatBackgroundGradient }}>
      
      {/* Top Panel (Workbench) */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 6 }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <Paper sx={{ m: 1, mt: 0.5, mb: 0.5, borderRadius: 10, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(6px)', boxShadow: '0 8px 24px rgba(15,23,42,0.06)', border: '1px solid rgba(255,255,255,0.45)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Current Project</Typography>
            <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={() => setIsWorkbenchCollapsed((s) => !s)}><KeyboardArrowUpIcon sx={{ transform: isWorkbenchCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 160ms' }} /></IconButton>
          </Box>
          <Collapse in={!isWorkbenchCollapsed} timeout="auto" unmountOnExit>
            <Box sx={{ p: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {hasAudio ? (
                  <Paper elevation={0} sx={{ border: '1px solid #eee', p: 1, flex: '1 1 auto', display: 'flex', alignItems: 'center', gap: 1, minWidth: 140, backgroundColor: '#fff', borderRadius: 2 }}>
                    <MusicNoteIcon sx={{ color: 'primary.main' }} />
                    <Box sx={{ overflow: 'hidden' }}><Typography noWrap variant="body2" sx={{ fontWeight: 'bold' }}>{conversation.assets.audio.title}</Typography><Typography variant="caption" color="text.secondary">{conversation.assets.audio.duration}</Typography></Box>
                    <IconButton sx={{ ml: 'auto' }}><PlayArrowIcon /></IconButton>
                  </Paper>
                ) : (
                  <Paper elevation={0} sx={{ border: '1px dashed #eee', p: 1, flex: '1 1 auto', display: 'flex', alignItems: 'center', gap: 1, minWidth: 140, backgroundColor: '#fff', borderRadius: 2 }}><MusicNoteIcon sx={{ color: '#cfcfcf' }} /><Typography variant="body2" sx={{ color: 'text.secondary' }}>No Audio</Typography></Paper>
                )}
                {hasVideos ? (
                  <Paper elevation={0} sx={{ border: '1px solid #eee', p: 0.5, width: 64, height: 64, borderRadius: 2, cursor: 'pointer' }} onClick={() => onOpenPreview(conversation.assets.videos[0])}><GradientPlaceholder gradientColor={conversation.assets.videos[0].gradient} style={{ width: '100%', height: '100%', borderRadius: 8 }}><VideocamIcon sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', color: '#fff' }} /></GradientPlaceholder></Paper>
                ) : (
                  <Paper elevation={0} sx={{ border: '1px dashed #eee', p: 0.5, width: 64, height: 64, borderRadius: 2 }}><Box sx={{ width: '100%', height: '100%', borderRadius: 8, background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><VideocamIcon sx={{ color: '#cfcfcf' }} /></Box></Paper>
                )}
              </Box>
            </Box>
          </Collapse>
        </Paper>
      </Box>

      {/* Message Stream */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2, background: conversationAreaGradient, borderRadius: '12px 12px 0 0', marginX: 1 }}>
        {conversation?.messages?.map(msg => {
          if (msg.type === 'user') return (<Box key={msg.id} sx={{ display: 'flex', justifyContent: 'flex-end' }}><Paper elevation={0} sx={{ p: 1, bgcolor: '#C3E0FF', maxWidth: '75%', borderRadius: '14px 14px 4px 14px', boxShadow: '0 6px 18px rgba(76,124,255,0.06)' }}><Typography variant="body2">{msg.text}</Typography></Paper></Box>);
          if (msg.type === 'ai') return (<Box key={msg.id} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}><GradientAvatar><AutoAwesomeIcon /></GradientAvatar><Paper sx={{ p: 1, maxWidth: '85%', borderRadius: '16px 16px 16px 8px', backgroundColor: '#FFFFFF', border: '1px solid rgba(15,23,42,0.04)', boxShadow: '0 10px 28px rgba(15,23,42,0.05)' }}><Typography variant="body2">{msg.text}</Typography></Paper></Box>);
          
          // Rendering Asset Cards (Music/Video)
          if (msg.type === 'ai_asset') {
            const content = msg.content || {};
            
            // Logic: Determine if this is real generated content or the initial mock data
            const isRealAsset = content.isReal || (content.audioSrc || content.videoSrc);

            if (!isRealAsset) {
                // === Plan A: Mock UI (Legacy Data) ===
                return (
                  <Box key={msg.id} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                    <GradientAvatar><AutoAwesomeIcon /></GradientAvatar>
                    <Paper sx={{ p: 1.25, maxWidth: '85%', borderRadius: 2, backgroundColor: '#fff', border: '1px solid rgba(15,23,42,0.04)', boxShadow: '0 8px 20px rgba(15,23,42,0.04)' }}>
                      <Chip label="V1" size="small" sx={{ background: gradient, color: 'white', fontWeight: 'bold', mb: 1 }} />
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>Assets Generated</Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 1, border: '1px solid #f0f0f0', borderRadius: 1 }}>
                        <MusicNoteIcon sx={{ color: 'primary.main' }} />
                        <Typography noWrap variant="body2">Lofi_Rain_V1.mp3</Typography>
                        <IconButton sx={{ ml: 'auto' }}><PlayArrowIcon /></IconButton>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, p: 1, border: '1px solid #f0f0f0', borderRadius: 1 }}>
                        <VideocamIcon sx={{ color: 'secondary.main' }} />
                        <Typography noWrap variant="body2">Rain_Clips_V1.mp4</Typography>
                        <IconButton sx={{ ml: 'auto' }} onClick={() => onOpenPreview({ gradient: themeVideoGradient1 })}><PlayArrowIcon /></IconButton>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, mt: 1, borderTop: '1px solid #f0f0f0', pt: 1, justifyContent: 'flex-end' }}>
                        <Button size="small" startIcon={<PushPinIcon />} sx={{ color: 'text.secondary' }}>Pin</Button>
                        <Button size="small" variant="contained" sx={{ borderRadius: '8px', background: gradient, color: 'white' }}>Download</Button>
                      </Box>
                    </Paper>
                  </Box>
                );
            } else {
                // === Plan B: Real generated content UI ===
                const isPlaying = playingId === msg.id;
                return (
                    <Box key={msg.id} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                    <GradientAvatar><AutoAwesomeIcon /></GradientAvatar>
                    <Paper sx={{ p: 1.25, maxWidth: '85%', borderRadius: 2, backgroundColor: '#fff', border: '1px solid rgba(15,23,42,0.04)', boxShadow: '0 8px 20px rgba(15,23,42,0.04)' }}>
                        <Chip label="Success" size="small" sx={{ background: gradient, color: 'white', fontWeight: 'bold', mb: 1 }} />
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>Generation Complete</Typography>

                        {/* 1. Real Audio Player */}
                        {content.audioSrc && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 1, border: '1px solid #f0f0f0', borderRadius: 1 }}>
                            <audio ref={el => audioRefs.current[msg.id] = el} src={content.audioSrc} onEnded={() => setPlayingId(null)} />
                            <MusicNoteIcon sx={{ color: 'primary.main' }} />
                            <Box sx={{ overflow: 'hidden' }}>
                            <Typography noWrap variant="body2">{content.audioTitle}</Typography>
                            <Typography variant="caption" color="text.secondary">{content.audioDuration}s • MusicGen</Typography>
                            </Box>
                            <IconButton sx={{ ml: 'auto' }} onClick={() => toggleAudio(msg.id)}>
                            {isPlaying ? <CloseIcon /> : <PlayArrowIcon />}
                            </IconButton>
                        </Box>
                        )}

                        {/* 2. Real Image/Video Preview */}
                        {content.videoSrc && (
                        <Paper sx={{ mt: 0.5, borderRadius: 2, overflow: 'hidden', position: 'relative', width: '100%', aspectRatio: '16/9', bgcolor: '#eee', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} onClick={() => onOpenPreview({ gradient: `url(${content.videoSrc}) center/cover` })}>
                            {content.videoSrc.startsWith('data:video') ? (
                                <video src={content.videoSrc} autoPlay loop muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <Box component="img" src={content.videoSrc} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                            <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                                <PlayArrowIcon color="primary" sx={{ fontSize: 28, ml: 0.5 }} />
                                </Box>
                            </Box>
                        </Paper>
                        )}

                        <Box sx={{ display: 'flex', gap: 1, mt: 1, borderTop: '1px solid #f0f0f0', pt: 1, justifyContent: 'flex-end' }}>
                        <Button size="small" startIcon={<PushPinIcon />} sx={{ color: 'text.secondary' }}>Pin</Button>
                        <Button size="small" variant="contained" sx={{ borderRadius: '8px', background: gradient, color: 'white' }}>Download</Button>
                        </Box>
                    </Paper>
                    </Box>
                );
            }
          }
          return null;
        })}
        <Box sx={{ height: 12 }} />
      </Box>

      {/* Bottom Input Area */}
      <Box sx={{ position: 'sticky', bottom: 0, zIndex: 8 }}>
        <Paper sx={{ p: 1, pt: 0.75, borderRadius: '14px 14px 0 0', boxShadow: '0 -12px 28px rgba(15,23,42,0.08)', borderTop: '1px solid rgba(0,0,0,0.04)', background: 'rgba(255,255,255,0.9)' }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
            <IconButton onClick={(e) => { setMenuAnchorEl(e.currentTarget); e.currentTarget.blur(); }} size="small"><AddIcon /></IconButton>
            <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={() => setMenuAnchorEl(null)}><MenuItem>Upload Audio</MenuItem><MenuItem>Hum Melody</MenuItem></Menu>

            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <FormControlLabel control={<Checkbox checked={useAudio} onChange={e => setUseAudio(e.target.checked)} size="small" sx={{ '&.Mui-checked': { color: 'primary.main' } }} />} label={<Typography variant="caption">Audio</Typography>} />
              <FormControlLabel control={<Checkbox checked={useVideo} onChange={e => setUseVideo(e.target.checked)} size="small" sx={{ '&.Mui-checked': { color: 'secondary.main' } }} />} label={<Typography variant="caption">Video</Typography>} />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>Duration:</Typography>
              <TextField size="small" variant="outlined" value={duration} onChange={e => setDuration(e.target.value)} placeholder="15" sx={{ width: 44, ml: 0.5, '& .MuiOutlinedInput-root': { borderRadius: '8px' }, '& input':{p:0.5, textAlign:'center'} }} />
              <Typography variant="caption" sx={{ml:0.5}}>s</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField fullWidth size="small" placeholder="I want a calm meditation track..." value={input} onChange={(e) => setInput(e.target.value)} disabled={isLoading} InputProps={{ sx: { borderRadius: '12px', backgroundColor: '#F8F9FA', '& .MuiOutlinedInput-notchedOutline': { border: 'none' } } }} />
            <Button variant="contained" onClick={submit} disabled={isLoading} sx={{ minWidth: 44, height: 36, borderRadius: 2, background: isLoading ? '#ccc' : gradient }}>
                {isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

// ---------------- Component: Library ----------------
function Library({ onOpenPreview }) {
  const [tabValue, setTabValue] = useState(0);
  const handleTabChange = (e, v) => setTabValue(v);
  const filtered = fakeLibraryAssets.filter(a => (tabValue === 1 ? a.type === 'audio' : tabValue === 2 ? a.type === 'video' : true));

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: chatBackgroundGradient }}>
      <Box sx={{ p: 2, pb: 0, pt: 1, display: 'flex', alignItems: 'center', gap: 1, background: 'linear-gradient(180deg, #FBF1FB 0%, #F1FAFF 100%)', borderRadius: '0 0 12px 12px' }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 8, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><VideoLibraryIcon sx={{ color: '#fff' }} /></Box>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Library</Typography>
      </Box>
      <Box sx={{ p: 2, pt: 1 }}>
        <TextField fullWidth variant="outlined" placeholder="Search by keyword (e.g. 'Piano')" InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>), sx: { borderRadius: '12px', backgroundColor: 'white' } }} />
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 1 }}>
          <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth" textColor="inherit" TabIndicatorProps={{ style: { height: 3, borderRadius: 3 } }}>
            <Tab label="All" sx={{ '&.Mui-selected': { color: theme.palette.primary.main } }} /><Tab label="Audio" sx={{ '&.Mui-selected': { color: theme.palette.primary.main } }} /><Tab label="Video" sx={{ '&.Mui-selected': { color: theme.palette.primary.main } }} />
          </Tabs>
        </Box>
      </Box>
      <Box sx={{ p: 2, flex: 1, overflowY: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, alignContent: 'start' }}>
          {filtered.map(asset => (
            <Paper key={asset.id} sx={{ borderRadius: 2, overflow: 'hidden', background: '#fff', border: '1px solid rgba(15,23,42,0.04)', boxShadow: '0 6px 18px rgba(15,23,42,0.03)', display: 'flex', flexDirection: 'column', minHeight: 220 }}>
              <Box sx={{ width: '100%', background: asset.gradient, position: 'relative', paddingTop: '66%' }}>
                {asset.type === 'audio' ? <MusicNoteIcon sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontSize: 24 }} /> : <VideocamIcon sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontSize: 24 }} />}
              </Box>
              <Box sx={{ p: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.title}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}><AccessTimeIcon sx={{ fontSize: '1rem', mr: 0.5 }} /><Typography variant="caption">{asset.duration}</Typography></Box>
                  <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={() => onOpenPreview(asset)}><DownloadIcon sx={{ fontSize: '1.15rem' }} /></IconButton>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

// ---------------- Component: Focus Timer ----------------
function Focus() {
  const DURATION = 25 * 60;
  const [timer, setTimer] = useState(DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const size = 200; const stroke = 10; const radius = (size-stroke)/2; const circumference = 2*Math.PI*radius;
  const progress = Math.max(0, Math.min(1, timer / DURATION)); const strokeOffset = circumference * (1 - progress);
  
  useEffect(() => { let t; if (isRunning && timer > 0) { t = setInterval(() => setTimer(x => Math.max(0, x-1)), 1000); } else if (!isRunning && timer === 0) { setIsRunning(false); } return () => clearInterval(t); }, [isRunning, timer]);
  
  const handleStartStop = () => { if (isRunning) setIsRunning(false); else { setTimer(prev => (prev === 0 ? DURATION : prev)); setIsRunning(true); } };
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3, alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: chatBackgroundGradient }}>
      <Box sx={{ minHeight: '2.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>{!isRunning && <Typography variant="body1" color="text.secondary">Stay focused until the timer ends</Typography>}</Box>
      <Box sx={{ position: 'relative', width: size, height: size, mb: 3 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}><circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#eee" strokeWidth={stroke} /><circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="url(#timerGradient)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeOffset} style={{ transition: 'stroke-dashoffset 1s linear' }} /><defs><linearGradient id="timerGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={theme.palette.secondary.main} /><stop offset="100%" stopColor={theme.palette.primary.main} /></linearGradient></defs></svg>
        <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'text.primary', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>{formatTime(timer)}</Typography>
      </Box>
      <Box sx={{ mb: 2, maxWidth: '420px', width: '100%', minHeight: 56 }}>{!isRunning && <TextField fullWidth variant="outlined" label="Custom Background Music" placeholder="Gentle rain, low volume" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'white' } }} />}</Box>
      {isRunning ? <Button variant="outlined" onClick={handleStartStop} disableFocusRipple sx={{ width: 'auto', minWidth: 120, borderRadius: '12px', fontSize: '1rem', px: 3, py: 1 }}>Stop</Button> : <Button fullWidth variant="contained" onClick={handleStartStop} disableFocusRipple sx={{ borderRadius: '12px', fontSize: '1rem', px: 4, py: 1, maxWidth: '420px', background: gradient, color: '#fff' }}>Start Focus</Button>}
    </Box>
  );
}

// ---------------- Component: Rename Dialog ----------------
function RenameDialog({ open, conversation, onClose, onSave }) {
  const [title, setTitle] = useState('');
  useEffect(() => { if (open && conversation) setTitle(conversation.title); }, [open, conversation]);
  const handleSave = () => { if (title.trim() && conversation) { onSave(conversation.id, title.trim()); onClose(); } };
  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: 4, width: '100%', margin: 2 } }}><DialogTitle>Rename Chat</DialogTitle><DialogContent><TextField autoFocus margin="dense" label="Title" type="text" fullWidth variant="outlined" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ mt: 1 }} /></DialogContent><DialogActions sx={{ p: 2 }}><Button onClick={onClose} sx={{ borderRadius: 2 }}>Cancel</Button><Button onClick={handleSave} variant="contained" sx={{ borderRadius: 2, background: gradient, color: 'white' }}>Save</Button></DialogActions></Dialog>
  );
}

// ---------------- Component: App (Main Controller) ----------------
export default function App() {
  const [conversations, setConversations] = useState(initialConversations);
  const [currentConversationId, setCurrentConversationId] = useState(conversations[0]?.id || null);
  const [navValue, setNavValue] = useState('create');
  const [isLeftOpen, setIsLeftOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [listMenuAnchor, setListMenuAnchor] = useState(null);
  const [listMenuFor, setListMenuFor] = useState(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  
  const currentConversation = conversations.find(c => c.id === currentConversationId);
  
  // App Actions
  const createConversation = (opts = {}) => { const newConv = { id: Date.now(), title: opts.title || 'New Chat', assets: { audio: null, videos: [] }, messages: [{ id: Date.now() + 1, type: 'ai', text: 'Hello! What kind of music would you like today?' }] }; setConversations(prev => [newConv, ...prev]); setCurrentConversationId(newConv.id); setNavValue('create'); setIsLeftOpen(false); };
  const addMessage = (convId, msg) => { setConversations(prev => prev.map(c => c.id === convId ? { ...c, messages: [...c.messages, msg] } : c)); };
  const openPreview = (asset) => setPreviewAsset(asset);
  const renameConversation = (id, newTitle) => { setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c)); };
  const deleteConversation = (id) => { if (!confirm('Delete this chat?')) return; setConversations(prev => prev.filter(c => c.id !== id)); setListMenuAnchor(null); if (currentConversationId === id) setCurrentConversationId(conversations.length ? conversations[0]?.id : null); };
  const selectConversation = (id) => { setCurrentConversationId(id); setNavValue('create'); setIsLeftOpen(false); };
  const openListMenu = (e, id) => { setListMenuAnchor(e.currentTarget); setListMenuFor(id); };
  const closeListMenu = () => { setListMenuAnchor(null); };

  const StatusBarSpacer = () => (<Box sx={{ height: 24, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, borderBottom: '1px solid rgba(0,0,0,0.02)' }}><Typography variant="caption" color="text.primary" sx={{ fontWeight: 'bold' }}>9:41</Typography><Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', color: 'text.primary' }}><SignalCellularAlt2BarIcon sx={{ fontSize: 16 }} /><WifiIcon sx={{ fontSize: 16 }} /><Battery50Icon sx={{ fontSize: 18 }} /></Box></Box>);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', width: '100vw', maxWidth: 430, margin: '0 auto', boxSizing: 'border-box', overflow: 'hidden', borderLeft: '1px solid #eee', borderRight: '1px solid #eee' }}>
        <StatusBarSpacer />
        
        {/* Navigation Bar */}
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'rgba(255,255,255,0.85)', color: 'text.primary', backdropFilter: 'blur(4px)' }}>
          <Toolbar sx={{ minHeight: 48 }}>
            {navValue === 'create' ? <IconButton edge="start" color="inherit" onClick={() => setIsLeftOpen(true)}><MenuIcon /></IconButton> : <Box sx={{ width: 48 }} />}
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>{navValue === 'create' && <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{currentConversation?.title || 'Chat'}</Typography>}</Box>
            {navValue === 'create' ? <IconButton edge="end" color="inherit" onClick={() => createConversation()}><CreateIcon /></IconButton> : <Box sx={{ width: 48 }} />}
          </Toolbar>
        </AppBar>

        {/* Main Content Area */}
        <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', inset: 0, overflow: 'auto', display: navValue === 'create' ? 'block' : 'none' }}>
            {currentConversation ? <CreatorStudio conversation={currentConversation} onAddMessage={addMessage} onOpenPreview={openPreview} /> : <Box sx={{ p: 2, background: chatBackgroundGradient }}><Typography>No active chat</Typography></Box>}
          </Box>
          <Box sx={{ position: 'absolute', inset: 0, overflow: 'auto', display: navValue === 'library' ? 'block' : 'none' }}><Library onOpenPreview={openPreview} /></Box>
          <Box sx={{ position: 'absolute', inset: 0, overflow: 'auto', display: navValue === 'focus' ? 'block' : 'none' }}><Focus /></Box>
        </Box>

        {/* Sidebar (History) */}
        <Drawer anchor="left" open={isLeftOpen} onClose={() => setIsLeftOpen(false)} PaperProps={{ sx: { width: '75vw', maxWidth: 520, p: 2, pt: 4, background: 'linear-gradient(180deg, #F6E7F6 0%, #E8F4FF 100%)', color: 'text.primary' } }}>
          <TextField fullWidth variant="outlined" size="small" label="Search Projects" placeholder="Search Projects" InputProps={{ sx: { borderRadius: '10px', backgroundColor: '#fff' } }} />
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}><GradientButton fullWidth onClick={() => createConversation({ title: 'New Chat' })}>New Chat</GradientButton><Button fullWidth variant="outlined" onClick={() => { setIsLeftOpen(false); setNavValue('library'); }}>Library</Button></Box>
          <Divider sx={{ my: 2 }} /><Typography variant="subtitle2" sx={{ mb: 1 }}>History</Typography>
          <List>{conversations.map(c => (<ListItemButton key={c.id} selected={c.id === currentConversationId} onClick={() => selectConversation(c.id)} onMouseEnter={() => setHoveredId(c.id)} onMouseLeave={() => setHoveredId(null)} sx={{ borderRadius: 2 }}><ListItemText primary={c.title} primaryTypographyProps={{ noWrap: true }} />{hoveredId === c.id && (<ListItemSecondaryAction><IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); openListMenu(e, c.id); }}><MoreVertIcon sx={{ fontSize: 20 }} /></IconButton></ListItemSecondaryAction>)}</ListItemButton>))}</List>
        </Drawer>
        
        {/* Modals & Dialogs */}
        <Menu anchorEl={listMenuAnchor} open={Boolean(listMenuAnchor)} onClose={closeListMenu}><MenuItem onClick={() => { closeListMenu(); setIsRenameDialogOpen(true); }}>Rename</MenuItem><MenuItem onClick={() => { deleteConversation(listMenuFor); closeListMenu(); }}>Delete</MenuItem></Menu>
        <RenameDialog open={isRenameDialogOpen} conversation={conversations.find(c => c.id === listMenuFor)} onClose={() => setIsRenameDialogOpen(false)} onSave={renameConversation} />
        
        <Dialog open={!!previewAsset} onClose={() => setPreviewAsset(null)} PaperProps={{ sx: { background: 'transparent', boxShadow: 'none' } }} BackdropProps={{ sx: { backgroundColor: 'rgba(0,0,0,0.6)' } }}>
          <Box sx={{ width: '80vw', maxWidth: 720 }}>
            <Paper sx={{ borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
              <Box sx={{ width: '100%', paddingTop: '56%', background: previewAsset?.gradient || videoGradient, position: 'relative' }}>
                {previewAsset?.videoSrc ? <Box component="img" src={previewAsset.videoSrc} sx={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, objectFit: 'cover' }} /> : <Box sx={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, background: previewAsset?.gradient || videoGradient }} />}
                <IconButton sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', bgcolor: 'rgba(255,255,255,0.12)' }}><PlayArrowIcon sx={{ fontSize: 36, color: '#fff' }} /></IconButton>
                <IconButton sx={{ position: 'absolute', right: 8, top: 8 }} onClick={() => setPreviewAsset(null)}><CloseIcon sx={{ color: '#fff' }} /></IconButton>
              </Box>
            </Paper>
          </Box>
        </Dialog>

        {/* Bottom Tab Navigation */}
        <Paper sx={{ position: 'sticky', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)' }} elevation={3}>
          <BottomNavigation showLabels value={navValue} onChange={(e, v) => setNavValue(v)}>
            <BottomNavigationAction label="Create" value="create" icon={<AutoAwesomeIcon sx={{ color: navValue === 'create' ? theme.palette.primary.main : undefined }} />} />
            <BottomNavigationAction label="Library" value="library" icon={<VideoLibraryIcon sx={{ color: navValue === 'library' ? theme.palette.primary.main : undefined }} />} />
            <BottomNavigationAction label="Focus" value="focus" icon={<SelfImprovementIcon sx={{ color: navValue === 'focus' ? theme.palette.primary.main : undefined }} />} />
            <BottomNavigationAction label="Sleep" value="sleep" icon={<BedtimeIcon />} disabled />
          </BottomNavigation>
        </Paper>
      </Box>
    </ThemeProvider>
  );
}