$path = "c:\trabajos\test\test13\app\src\storage\tickets.local.ts"
$content = Get-Content $path -Raw

$find1 = @"
  synced: boolean; // true si ya fue sincronizado con el backend
  createdAt: string;

  // Added rubro props for legacy fallback or sync
  rubroIncome?: string;
  rubroExpense?: string;
  rubro?: string;
  globalType?: string;
  shortId?: string;
}
"@

$replace1 = @"
  synced: boolean; // true si ya fue sincronizado con el backend
  createdAt: string;

  // Added rubro props for legacy fallback or sync
  rubroIncome?: string;
  rubroExpense?: string;
  rubro?: string;
  toRubro?: string;
  globalType?: string;
  shortId?: string;
}
"@

$find2 = @"
      rubroIncome: st.rubroIncome,
      rubroExpense: st.rubroExpense,
      rubro: st.rubro,
      globalType: st.globalType,
      shortId: st.shortId,
    });
"@

$replace2 = @"
      rubroIncome: st.rubroIncome,
      rubroExpense: st.rubroExpense,
      rubro: st.rubro,
      toRubro: st.toRubro,
      globalType: st.globalType,
      shortId: st.shortId,
    });
"@

$content = $content.Replace($find1, $replace1)
$content = $content.Replace($find2, $replace2)

$content | Set-Content $path -Encoding UTF8
Write-Host "Done"
