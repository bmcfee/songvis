#!/usr/bin/env python
'''Usage: ./batch_analyzer output_directory/ /path/to/file/glob/*.audio'''


import sys
import os
import glob
import ujson as json

import analyzer


if __name__ == '__main__':
    output_directory    = os.path.realpath(sys.argv[1])
    files               = sorted(glob.glob(sys.argv[2]))

    index = {}
    for (i, f) in enumerate(files):
        print '%6d:\t%s' % (i, f)
        data = analyzer.analyze_file(f)
        output = output_directory + os.path.sep + ('%06d.json' % i)
        with open(output, 'w') as f_output:
            json.dump(data, f_output)

        index['%06d' % i] = {   'data': output, 
                                'meta': data['metadata'], 
                                'audio': os.path.basename(f)}

    with open('index.json', 'w') as f_idx:
        json.dump(index, f_idx)
