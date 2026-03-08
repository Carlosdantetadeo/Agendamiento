lines = open('src/pages/AdminPage.tsx', 'r', encoding='utf-8').readlines()
# Show lines 768-815 to see full confirmed block
for i, l in enumerate(lines[768:815], start=769):
    print(f'{i}: {l}', end='')
