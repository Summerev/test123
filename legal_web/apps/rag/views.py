from django.shortcuts import render

def rag_query(request):
    return render(request, 'rag/rag_query.html')
