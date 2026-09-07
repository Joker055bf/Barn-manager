const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const broken = `                                                             {colorNames[tagCol] || 'ملون'}
                                                           </span>
 </div>
                                                   </div>
                                                )}
                                              </div>
                                               );
                                            })}`;

const fixed = `                                                             {colorNames[tagCol] || 'ملون'}
                                                           </span>
                                                         </div>
                                                       );
                                                     })()}
                                                    <div><span className="text-gray-400">التاريخ: </span>{new Date(log.timestamp).toLocaleString('ar-EG', { numberingSystem: 'latn' })}</div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                         })}`;

if (code.includes(broken)) {
    code = code.replace(broken, fixed);
    fs.writeFileSync('App.tsx', code, 'utf8');
    console.log('SUCCESS');
} else {
    console.log('BROKEN PATTERN NOT FOUND');
    // Let's print around line 3535 to 3545
    const lines = code.split('\n');
    console.log(lines.slice(3530, 3550).join('\n'));
}
