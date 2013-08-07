#!/usr/bin/env python
'''Audio content analysis script

CREATED:2013-05-22 12:18:53 by Brian McFee <brm2132@columbia.edu>

Usage:

./analyzer.py song.mp3 analysis_output.json

'''

import sys
import ujson as json

import numpy as np
import scipy, scipy.signal, scipy.ndimage

import mutagen

import librosa

HOP = 64
SR  = 22050

def structure(X, k=3, tau=0.05):

    d, n = X.shape

    R = librosa.segment.recurrence_matrix(X,    metric='seuclidean', 
                                                k=int(np.ceil(tau * n)), 
                                                width=3, sym=False)

    links = np.argsort(R, axis=1)[:,-k:]

    # Generate the structure feature
    S = librosa.segment.structure_feature(R, pad=True)

    # median-filter to suppress noise/fill in gaps
    P = scipy.ndimage.median_filter(S, [1, 7], mode='constant')

    # get the node clustering
    segments    = np.array(librosa.segment.agglomerative(P, n / 24))

    return links, segments

def analyze_file(infile):
    '''Analyze an input audio file

    Arguments
    ---------
    infile  -- (str) path to input file


    Returns
    -------
    analysis -- (dict) of various useful things
    '''

    A = {}

    A['metadata'] = dict(mutagen.File(infile, easy=True)) or {}
    
    A['filename'] = infile

    y, sr = librosa.load(infile, sr=SR)
    
    # First, get the track duration
    A['duration'] = float(len(y)) / sr

    S = librosa.feature.melspectrogram(y, sr,   n_fft=2048, 
                                                hop_length=HOP, 
                                                n_mels=256, 
                                                fmax=8000)
    S = S / S.max()

    onsets = np.median(np.maximum(0.0, np.diff(S, axis=1)), axis=0)
    onsets = onsets / onsets.max()
    tempo, beats = librosa.beat.beat_track(sr=SR, onsets=onsets, hop_length=HOP, n_fft=2048, trim=False)

    # Push the last frame as a phantom beat
    A['tempo'] = tempo
    A['beats'] = librosa.frames_to_time(beats, sr, hop_length=HOP).tolist()

    
    A['spectrogram'] = librosa.logamplitude(librosa.feature.sync(S, beats)**2).T.tolist()

    # Let's make some beat-synchronous mfccs
    S = librosa.feature.mfcc(librosa.logamplitude(S), d=13)
    A['timbres'] = librosa.feature.sync(S, beats).T.tolist()

    # And some chroma
    S = np.abs(librosa.stft(y, hop_length=HOP))

    # Grab the harmonic component
    H = librosa.hpss.hpss_median(S, win_P=19, win_H=19, p=2.0)[0]
    A['chroma'] = librosa.feature.sync(librosa.feature.chromagram(H, sr),
                                        beats,
                                        aggregate=np.median).T.tolist()

    # Harmonicity: ratio of H::S averaged per frame
    A['harmonicity'] = librosa.feature.sync(np.mean(H / (S + (S==0)), axis=0, keepdims=True),
                                            beats,
                                            aggregate=np.max).flatten().tolist()


    # Relative loudness
    S = S / S.max()
    S = S**2

    A['loudness'] = librosa.feature.sync(np.max(librosa.logamplitude(S), 
                                                axis=0,
                                                keepdims=True), 
                                         beats, aggregate=np.max).flatten().tolist()

    # Subsample the signal for vis purposes
    A['signal'] = scipy.signal.decimate(y, len(y) / 1024, ftype='fir').tolist()

    links, segs = structure(np.array(A['timbres']).T[1:,:])
    A['links'] = links.tolist()
    A['segments'] = segs.tolist()

    return A

if __name__ == '__main__':
    A = analyze_file(sys.argv[1])
    with open(sys.argv[2], 'w') as f:
        json.dump(A, f)
        pass
