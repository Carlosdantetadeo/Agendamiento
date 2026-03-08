lines = open('src/pages/AdminPage.tsx', 'r', encoding='utf-8').readlines()
result = lines[:815] + lines[816:]
open('src/pages/AdminPage.tsx', 'w', encoding='utf-8').writelines(result)
print('Done, lines:', len(result))
