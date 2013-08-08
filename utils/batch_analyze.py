#!/usr/bin/env python
'''Usage: ./batch_analyzer index.json output_directory/ /path/to/file/glob/*.audio'''

N_JOBS=2

import sys
import os
import glob
import ujson as json

from joblib import Parallel, delayed

import analyzer

def process_file(output_directory, i, filename):

    print '%6d:\t%s' % (i, filename)
    data = analyzer.analyze_file(filename)
    output = output_directory + os.path.sep + ('%06d.json' % i)
    with open(output, 'w') as f_output:
        json.dump(data, f_output)

    return (i, {'data': output, 'meta': data['metadata'], 'audio': os.path.basename(filename)})

if __name__ == '__main__':
    index_file          = sys.argv[1]
    output_directory    = os.path.realpath(sys.argv[2])
    files               = sorted(glob.glob(sys.argv[3]))

    if os.path.exists(index_file):
        with open(index_file, 'r') as f_idx:
            index = json.load(f_idx)
        start_index = 1 + max(map(int, index.keys()))
    else:
        index = {}
        start_index = 0

    for (i, results) in Parallel(n_jobs=N_JOBS)(delayed(process_file)(output_directory, *z) for z in enumerate(files, start_index)):
        index['%06d' % i] = results

    with open(index_file, 'w') as f_idx:
        json.dump(index, f_idx)
