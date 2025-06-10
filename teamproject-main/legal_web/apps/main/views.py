from django.shortcuts import render

def chatbot_view(request):
    return render(request, 'main/index.html')

def chat_interface(request):
    return render(request, 'main/index.html') 