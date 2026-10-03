export interface WebRTCConfig {
  stunUrl?: string;
  turnUrl?: string;
  turnUsername?: string;
  turnCredential?: string;
}

export class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private cameraVideoTrack: MediaStreamTrack | null = null;
  private iceCandidateQueue: RTCIceCandidateInit[] = [];
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onIceCandidateCallback: ((candidate: RTCIceCandidate) => void) | null = null;
  private onConnectionStateCallback: ((state: RTCPeerConnectionState) => void) | null = null;

  private getRTCConfiguration(): RTCConfiguration {
    const metaEnv = (import.meta as any).env || {};
    const stunUrl = metaEnv.VITE_WEBRTC_STUN_URL || 'stun:stun.l.google.com:19302';
    const turnUrl = metaEnv.VITE_WEBRTC_TURN_URL;
    const turnUsername = metaEnv.VITE_WEBRTC_TURN_USERNAME;
    const turnCredential = metaEnv.VITE_WEBRTC_TURN_CREDENTIAL;

    const iceServers: RTCIceServer[] = [{ urls: stunUrl }];

    if (turnUrl) {
      iceServers.push({
        urls: turnUrl,
        username: turnUsername,
        credential: turnCredential,
      });
    }

    return { iceServers };
  }

  private createFallbackStream(video: boolean = false): MediaStream {
    const stream = new MediaStream();

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const dest = ctx.createMediaStreamDestination();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.0001; // Soft silent audio track
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      }
    } catch (_) {}

    if (video) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 640, 480);
          ctx.fillStyle = '#6366f1';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText('Live Stream Active', 230, 240);
        }
        const canvasStream = canvas.captureStream(10);
        canvasStream.getVideoTracks().forEach((t) => stream.addTrack(t));
      } catch (_) {}
    }

    this.localStream = stream;
    return stream;
  }

  async getUserMedia(video: boolean = false): Promise<MediaStream> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('[WebRTC] getUserMedia not supported, using fallback stream');
      return this.createFallbackStream(video);
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      });

      if (video) {
        this.cameraVideoTrack = this.localStream.getVideoTracks()[0] || null;
      }

      return this.localStream;
    } catch (err: any) {
      console.warn('[WebRTC getUserMedia Error, trying fallback]:', err?.message || err);

      // Attempt audio-only if video failed
      if (video) {
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          return this.localStream;
        } catch (_) {}
      }

      // Final fallback synthetic stream so calls never crash
      return this.createFallbackStream(video);
    }
  }

  createPeerConnection(
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onRemoteStream: (stream: MediaStream) => void,
    onConnectionState?: (state: RTCPeerConnectionState) => void
  ): RTCPeerConnection {
    this.cleanupPeerConnection();

    this.onIceCandidateCallback = onIceCandidate;
    this.onRemoteStreamCallback = onRemoteStream;
    this.onConnectionStateCallback = onConnectionState || null;
    this.iceCandidateQueue = [];

    const config = this.getRTCConfiguration();
    this.pc = new RTCPeerConnection(config);
    this.remoteStream = new MediaStream();

    // Attach local tracks to PeerConnection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.pc && this.localStream) {
          this.pc.addTrack(track, this.localStream);
        }
      });
    }

    // Handle remote track
    this.pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((t) => {
          if (this.remoteStream && !this.remoteStream.getTracks().includes(t)) {
            this.remoteStream.addTrack(t);
          }
        });
        if (this.onRemoteStreamCallback && this.remoteStream) {
          this.onRemoteStreamCallback(this.remoteStream);
        }
      }
    };

    // Handle ICE Candidate
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidateCallback) {
        this.onIceCandidateCallback(event.candidate);
      }
    };

    // Monitor Connection state
    this.pc.onconnectionstatechange = () => {
      if (this.pc && this.onConnectionStateCallback) {
        this.onConnectionStateCallback(this.pc.connectionState);
      }
    };

    return this.pc;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error('Peer connection not initialized');
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error('Peer connection not initialized');
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) throw new Error('Peer connection not initialized');
    const desc = new RTCSessionDescription(sdp);
    await this.pc.setRemoteDescription(desc);

    // Process queued ICE candidates
    while (this.iceCandidateQueue.length > 0) {
      const candidate = this.iceCandidateQueue.shift();
      if (candidate) {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc || !this.pc.remoteDescription || !this.pc.remoteDescription.type) {
      this.iceCandidateQueue.push(candidate);
      return;
    }

    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (_) {}
  }

  toggleAudio(enabled: boolean): boolean {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = enabled;
      });
      return enabled;
    }
    return false;
  }

  toggleVideo(enabled: boolean): boolean {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = enabled;
      });
      return enabled;
    }
    return false;
  }

  async startScreenShare(onEndCallback?: () => void): Promise<MediaStream | null> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error('Screen sharing is not supported by your browser.');
    }

    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenVideoTrack = this.screenStream.getVideoTracks()[0];

      if (screenVideoTrack && this.pc) {
        const senders = this.pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');

        if (videoSender) {
          videoSender.replaceTrack(screenVideoTrack);
        } else if (this.localStream) {
          this.pc.addTrack(screenVideoTrack, this.localStream);
        }

        screenVideoTrack.onended = () => {
          this.stopScreenShare();
          if (onEndCallback) onEndCallback();
        };
      }

      return this.screenStream;
    } catch (err: any) {
      if (err.name === 'NotAllowedError') return null; // User cancelled prompt
      throw err;
    }
  }

  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }

    if (this.cameraVideoTrack && this.pc) {
      const senders = this.pc.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
      if (videoSender) {
        videoSender.replaceTrack(this.cameraVideoTrack);
      }
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  cleanupPeerConnection() {
    if (this.pc) {
      this.pc.onicecandidate = null;
      this.pc.ontrack = null;
      this.pc.onconnectionstatechange = null;
      this.pc.close();
      this.pc = null;
    }
    this.iceCandidateQueue = [];
  }

  cleanupLocalMedia() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }
    this.cameraVideoTrack = null;
  }

  destroy() {
    this.cleanupPeerConnection();
    this.cleanupLocalMedia();
  }
}

export const webrtcService = new WebRTCService();
