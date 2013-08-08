#!/usr/bin/env python
'''Usage: ./batch_analyzer index.json output_directory/ /path/to/file/glob/*.audio'''


import sys
import os
import glob
import ujson as json

import analyzer


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

    for (i, f) in enumerate(files, start_index):
        print '%6d:\t%s' % (i, f)
        data = analyzer.analyze_file(f)
        output = output_directory + os.path.sep + ('%06d.json' % i)
        with open(output, 'w') as f_output:
            json.dump(data, f_output)

        index['%06d' % i] = {   'data': output, 
                                'meta': data['metadata'], 
                                'audio': os.path.basename(f)}

    with open(index_file, 'w') as f_idx:
        json.dump(index, f_idx)
