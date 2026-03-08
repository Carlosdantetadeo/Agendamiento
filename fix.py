lines = open('src/pages/AdminPage.tsx', 'r', encoding='utf-8').readlines()
# Line 808 (index 807) has the broken '<a' tag - replace lines 807-818
new_lines = (
    lines[:807] +
    ['        <a href={confirmed.waUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] text-white rounded-xl font-medium text-sm">Enviar confirmacion por WhatsApp</a>\n'] +
    lines[818:]
)
open('src/pages/AdminPage.tsx', 'w', encoding='utf-8').writelines(new_lines)
print('Done, total lines:', len(new_lines))
