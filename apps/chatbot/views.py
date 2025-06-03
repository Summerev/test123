from django.shortcuts import render

def chat_interface(request):
    return render(request, 'chatbot/chat.html')
