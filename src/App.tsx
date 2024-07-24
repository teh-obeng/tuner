import { useEffect, useMemo, useRef, useState } from "react";
// @ts-ignore
import yin from "yinjs";
import "./App.css";

enum RecordingState {
  START = 1,
  STOP = 0,
}

function App() {
  const [recordingState, setRecordingState] = useState<RecordingState>(
    RecordingState.STOP
  );

  const [frequency, setFrequency] = useState("");
  const [stream, setStream] = useState<MediaStream>();
  const { audioContext, analyser } = useMemo(() => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    return { audioContext, analyser };
  }, []);
  const requestRef = useRef<number>();
  const canvas = useRef<HTMLCanvasElement>(null);

  const toggleRecording = () => {
    setRecordingState((s) =>
      s === RecordingState.START ? RecordingState.STOP : RecordingState.START
    );
  };

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: false, audio: true })
      .then((stream) => {
        stream.getAudioTracks()[0].enabled = false;
        setStream(stream);
      })
      .catch((err) => {
        console.error(`you got an error: ${err}`);
      });
  }, []);

  useEffect(() => {
    if (!stream) return;
    if (recordingState === RecordingState.START) startRecording();
    else stopRecording();
  }, [recordingState, stream]);

  const calculateFrequency = (data: Float32Array) => {
    analyser.getFloatTimeDomainData(data);
    console.log(analyser.frequencyBinCount);
    const freq = yin(data, audioContext.sampleRate, 0.4);
    if (freq > 50) {
      console.log(freq);
      setFrequency(freq);
    }

    if (!canvas.current) return;

    const canvasCtx = canvas.current.getContext("2d")!;
    const bufferLength = analyser.frequencyBinCount;
    const WIDTH = canvas.current.width;
    const HEIGHT = canvas.current.height;

    canvasCtx.fillStyle = "rgb(200 200 200)";
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = "rgb(0 0 0)";
    canvasCtx.beginPath();

    const sliceWidth = (WIDTH * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = data[i] * 200.0;
      const y = HEIGHT / 2 + v;

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    canvasCtx.lineTo(WIDTH, HEIGHT / 2);
    canvasCtx.stroke();

    requestRef.current = setTimeout(() => calculateFrequency(data), 10);
  };

  const startRecording = () => {
    if (!stream) return;

    audioContext.resume();
    stream.getAudioTracks()[0].enabled = true;
    analyser.fftSize = Math.pow(2, 13);

    const data = new Float32Array(analyser.fftSize);

    const mediaStreamSource = audioContext.createMediaStreamSource(stream);
    mediaStreamSource.connect(analyser);

    requestRef.current = setTimeout(() => calculateFrequency(data), 10);
  };

  const stopRecording = () => {
    if (stream) {
      stream.getAudioTracks()[0].enabled = false;
    }
    clearTimeout(requestRef.current);
  };

  return (
    <>
      <h1>Music Tuner</h1>
      <div className="card">
        <button onClick={toggleRecording}>
          {recordingState === RecordingState.START ? "Stop" : "Start"} Recording
        </button>
      </div>
      <div className="card">{frequency} Hz</div>
      <canvas ref={canvas} width={500} height={500}></canvas>
    </>
  );
}

export default App;
